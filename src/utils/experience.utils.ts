export function calculateExperienceMatch(workerExperience: number, requiredExperience: number): number {
  if (workerExperience >= requiredExperience) return 1;
  if (workerExperience <= 0) return 0;
  
  return workerExperience / requiredExperience;
}
