"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getTenant() {
  const cookieStore = await cookies();
  return cookieStore.get("tenant_id")?.value;
}

export async function createPatient(data: { name: string, phone?: string, document?: string }) {
  const tenantId = await getTenant();
  if (!tenantId) throw new Error("Tenant não identificado");

  const patient = await prisma.patient.create({
    data: {
      ...data,
      tenantId
    }
  });

  revalidatePath("/admin/pacientes");
  return { success: true, patient };
}

export async function getPatients() {
  const tenantId = await getTenant();
  if (!tenantId) return [];

  return await prisma.patient.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' }
  });
}

export async function createClinicalFile(patientId: string, data: { diagnosis?: string, complaint?: string }) {
  const tenantId = await getTenant();
  if (!tenantId) throw new Error("Tenant não identificado");

  const file = await prisma.clinicalFile.create({
    data: {
      ...data,
      patientId,
      tenantId
    }
  });

  revalidatePath("/admin/fisioterapia/prontuario");
  return { success: true, file };
}

export async function getClinicalRecords() {
  const tenantId = await getTenant();
  if (!tenantId) return [];

  return await prisma.patient.findMany({
    where: { 
      tenantId,
      clinicalFiles: { some: {} }
    },
    include: {
      clinicalFiles: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      evolutions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
}
