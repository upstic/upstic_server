export function calculateSkillMatch(workerSkills: string[], jobSkills: string[]): number {
  if (!workerSkills.length || !jobSkills.length) return 0;

  const matchingSkills = workerSkills.filter(skill => 
    jobSkills.some(jobSkill => jobSkill.toLowerCase() === skill.toLowerCase())
  );

  return matchingSkills.length / jobSkills.length;
}
