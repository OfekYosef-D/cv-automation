import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import type { CvPlaceholderSchemaItem } from "./cv.types";

interface GenerateFieldValuesInput {
  allowedTokens: string[];
  placeholders: CvPlaceholderSchemaItem[];
  baseCvContent: string;
  job: {
    title: string;
    description: string;
    company: string | null;
    location: string | null;
    salary: string | null;
    tags: string[];
  };
  profile: {
    desiredRoles: string[];
    seniority: string;
    location: string;
    mustHaveSkills: string[];
  } | null;
}

@Injectable()
export class OpenAiCvGenerationService {
  async generateFieldValues(input: GenerateFieldValuesInput): Promise<Record<string, string>> {
    if (input.allowedTokens.length === 0) {
      return {};
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "OpenAI generation is not configured. Set OPENAI_API_KEY."
      );
    }

    const model = process.env.OPENAI_CV_MODEL ?? "gpt-5-mini";
    const schema = {
      type: "object",
      additionalProperties: false,
      required: input.allowedTokens,
      properties: Object.fromEntries(
        input.allowedTokens.map((token) => [
          token,
          {
            type: "string",
            description: this.describeToken(token, input.placeholders)
          }
        ])
      )
    };

    const placeholderInstructions = input.placeholders
      .filter((placeholder) => input.allowedTokens.includes(placeholder.token))
      .map((placeholder) => {
        const instructionSuffix = placeholder.instructions
          ? ` Instructions: ${placeholder.instructions}`
          : "";
        return `- ${placeholder.token}: ${placeholder.sourceKey}.${instructionSuffix}`;
      })
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cv_placeholder_values",
            strict: true,
            schema
          }
        },
        messages: [
          {
            role: "system",
            content:
              "You write tailored CV placeholder content. Only restate or reorganize claims grounded in the base CV and profile. Never invent experience, metrics, employers, or certifications. Return valid JSON only."
          },
          {
            role: "user",
            content: [
              "Fill the requested placeholder tokens for a tailored CV draft.",
              "",
              "Requested placeholders:",
              placeholderInstructions,
              "",
              "Base CV snapshot:",
              input.baseCvContent,
              "",
              "Job:",
              JSON.stringify(input.job, null, 2),
              "",
              "Profile:",
              JSON.stringify(input.profile, null, 2)
            ].join("\n")
          }
        ]
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("OpenAI generation request failed.");
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          refusal?: string | null;
        };
      }>;
    };

    const message = payload.choices?.[0]?.message;
    if (message?.refusal) {
      throw new ServiceUnavailableException("OpenAI refused the CV generation request.");
    }

    const content = message?.content;
    if (!content) {
      throw new ServiceUnavailableException("OpenAI did not return generated placeholder values.");
    }

    const parsed = JSON.parse(content) as Record<string, string>;
    return Object.fromEntries(
      input.allowedTokens.map((token) => [token, String(parsed[token] ?? "")])
    );
  }

  private describeToken(token: string, placeholders: CvPlaceholderSchemaItem[]): string {
    const placeholder = placeholders.find((item) => item.token === token);
    return placeholder?.instructions || placeholder?.sourceKey || token;
  }
}
