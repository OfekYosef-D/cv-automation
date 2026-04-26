import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { docs_v1, google } from "googleapis";

import { GoogleIntegrationService } from "../integrations/google/google-integration.service";

export const GOOGLE_DOCS_GATEWAY = "GOOGLE_DOCS_GATEWAY";

export interface GoogleDocumentSnapshot {
  documentId: string;
  title: string;
  url: string;
  plainText: string;
  placeholders: string[];
}

export interface GoogleDocumentCopy {
  documentId: string;
  title: string;
  url: string;
}

export interface GoogleDocsGateway {
  getDocument(tenantId: string, documentId: string): Promise<GoogleDocumentSnapshot>;
  copyDocument(tenantId: string, documentId: string, title: string): Promise<GoogleDocumentCopy>;
  replacePlaceholders(
    tenantId: string,
    documentId: string,
    replacements: Record<string, string>
  ): Promise<void>;
}

@Injectable()
export class GoogleWorkspaceDocsGateway implements GoogleDocsGateway {
  constructor(private readonly googleIntegrationService: GoogleIntegrationService) {}

  async getDocument(tenantId: string, documentId: string): Promise<GoogleDocumentSnapshot> {
    const { docs, drive } = await this.getClients(tenantId);
    const [documentResponse, fileResponse] = await Promise.all([
      docs.documents.get({ documentId }),
      drive.files.get({
        fileId: documentId,
        fields: "id,name,webViewLink"
      })
    ]);

    const title = fileResponse.data.name || documentResponse.data.title || "Connected CV";
    const plainText = this.extractText(documentResponse.data.body?.content ?? []).trim();

    return {
      documentId,
      title,
      url: fileResponse.data.webViewLink || this.toDocumentUrl(documentId),
      plainText,
      placeholders: this.extractPlaceholders(plainText)
    };
  }

  async copyDocument(
    tenantId: string,
    documentId: string,
    title: string
  ): Promise<GoogleDocumentCopy> {
    const { drive } = await this.getClients(tenantId);
    const response = await drive.files.copy({
      fileId: documentId,
      requestBody: {
        name: title
      },
      fields: "id,name,webViewLink"
    });

    const copiedId = response.data.id;
    if (!copiedId) {
      throw new ServiceUnavailableException("Google Drive did not return a copied document ID.");
    }

    return {
      documentId: copiedId,
      title: response.data.name || title,
      url: response.data.webViewLink || this.toDocumentUrl(copiedId)
    };
  }

  async replacePlaceholders(
    tenantId: string,
    documentId: string,
    replacements: Record<string, string>
  ): Promise<void> {
    const { docs } = await this.getClients(tenantId);
    const requests: docs_v1.Schema$Request[] = Object.entries(replacements).map(
      ([token, value]) => ({
        replaceAllText: {
          containsText: {
            text: `{{${token}}}`,
            matchCase: true
          },
          replaceText: value
        }
      })
    );

    if (requests.length === 0) {
      return;
    }

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
  }

  private async getClients(tenantId: string) {
    const auth = await this.googleIntegrationService.getAuthorizedClient(tenantId);

    return {
      docs: google.docs({ version: "v1", auth }),
      drive: google.drive({ version: "v3", auth })
    };
  }

  private extractText(elements: docs_v1.Schema$StructuralElement[]): string {
    return elements
      .map((element) => {
        if (element.paragraph?.elements) {
          return element.paragraph.elements
            .map((paragraphElement) => paragraphElement.textRun?.content ?? "")
            .join("");
        }

        if (element.table?.tableRows) {
          return element.table.tableRows
            .map((row) =>
              row.tableCells
                ?.map((cell) => this.extractText(cell.content ?? []))
                .join(" | ") ?? ""
            )
            .join("\n");
        }

        if (element.tableOfContents?.content) {
          return this.extractText(element.tableOfContents.content);
        }

        return "";
      })
      .join("")
      .replace(/\r/g, "");
  }

  private extractPlaceholders(plainText: string): string[] {
    const matches = plainText.match(/\{\{([A-Z0-9_]+)\}\}/g) ?? [];
    return Array.from(
      new Set(matches.map((match) => match.replace(/[{}]/g, "")))
    );
  }

  private toDocumentUrl(documentId: string): string {
    return `https://docs.google.com/document/d/${documentId}/edit`;
  }
}
