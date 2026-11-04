// The sentence a view prints when a prompt starts a skill that is not installed, and the step that installs it. One copy,
// so the developer and manager views cannot word the same gap two ways.
import { promptsFor, skillsOf } from "../../memory/prompts.js";
export const INSTALL_SKILLS = "3c skills install";
/** The skills the prompts start, which a workspace has to hold for them to work. */
export const promptSkills = () => skillsOf(promptsFor(1));
export function missingSkillLines(installed) {
    return promptSkills()
        .filter((name) => !installed.has(name))
        .map((name) => `/${name} is not installed in this workspace, so the prompt that starts it will not work. This blocks nothing; the prompt is still shown.`);
}
//# sourceMappingURL=prompt-skills.js.map