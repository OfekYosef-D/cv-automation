import { Injectable } from "@nestjs/common";
import { prisma } from "@cv/db";

import { ProfileResponseDto, Seniority, UpsertProfileDto } from "./profile.dto";

@Injectable()
export class ProfileService {
  async getProfile(tenantId: string): Promise<ProfileResponseDto | null> {
    const profile = await prisma.userProfile.findUnique({
      where: { tenantId }
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      desiredRoles: profile.desiredRoles,
      seniority: profile.seniority as Seniority,
      location: profile.location,
      mustHaveSkills: profile.mustHaveSkills,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString()
    };
  }

  async upsertProfile(tenantId: string, dto: UpsertProfileDto): Promise<ProfileResponseDto> {
    const profile = await prisma.userProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        desiredRoles: dto.desiredRoles,
        seniority: dto.seniority,
        location: dto.location,
        mustHaveSkills: dto.mustHaveSkills
      },
      update: {
        desiredRoles: dto.desiredRoles,
        seniority: dto.seniority,
        location: dto.location,
        mustHaveSkills: dto.mustHaveSkills
      }
    });

    return {
      id: profile.id,
      desiredRoles: profile.desiredRoles,
      seniority: profile.seniority as Seniority,
      location: profile.location,
      mustHaveSkills: profile.mustHaveSkills,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString()
    };
  }
}
