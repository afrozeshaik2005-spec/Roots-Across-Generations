-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN     "surname" TEXT;

-- CreateIndex
CREATE INDEX "FamilyMember_fullName_idx" ON "FamilyMember"("fullName");

-- CreateIndex
CREATE INDEX "FamilyMember_surname_idx" ON "FamilyMember"("surname");

-- CreateIndex
CREATE INDEX "FamilyMember_birthVillageCity_idx" ON "FamilyMember"("birthVillageCity");

-- CreateIndex
CREATE INDEX "FamilyMember_occupation_idx" ON "FamilyMember"("occupation");

-- CreateIndex
CREATE INDEX "FamilyMember_bloodGroup_idx" ON "FamilyMember"("bloodGroup");

-- CreateIndex
CREATE INDEX "FamilyMember_generationNumber_idx" ON "FamilyMember"("generationNumber");
