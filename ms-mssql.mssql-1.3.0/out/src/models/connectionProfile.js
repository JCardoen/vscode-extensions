'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const LocalizedConstants = require("../constants/localizedConstants");
const interfaces_1 = require("./interfaces");
const connectionCredentials_1 = require("./connectionCredentials");
const question_1 = require("../prompts/question");
const utils = require("./utils");
// Concrete implementation of the IConnectionProfile interface
/**
 * A concrete implementation of an IConnectionProfile with support for profile creation and validation
 */
class ConnectionProfile extends connectionCredentials_1.ConnectionCredentials {
    /**
     * Creates a new profile by prompting the user for information.
     * @param  {IPrompter} prompter that asks user the questions needed to complete a profile
     * @param  {IConnectionProfile} (optional) default profile values that will be prefilled for questions, if any
     * @returns Promise - resolves to undefined if profile creation was not completed, or IConnectionProfile if completed
     */
    static createProfile(prompter, defaultProfileValues) {
        let profile = new ConnectionProfile();
        // Ensure all core properties are entered
        let authOptions = connectionCredentials_1.ConnectionCredentials.getAuthenticationTypesChoice();
        if (authOptions.length === 1) {
            // Set default value as there is only 1 option
            profile.authenticationType = authOptions[0].value;
        }
        let questions = connectionCredentials_1.ConnectionCredentials.getRequiredCredentialValuesQuestions(profile, true, false, defaultProfileValues);
        // Check if password needs to be saved
        questions.push({
            type: question_1.QuestionTypes.confirm,
            name: LocalizedConstants.msgSavePassword,
            message: LocalizedConstants.msgSavePassword,
            shouldPrompt: (answers) => !profile.connectionString && connectionCredentials_1.ConnectionCredentials.isPasswordBasedCredential(profile),
            onAnswered: (value) => profile.savePassword = value
        }, {
            type: question_1.QuestionTypes.input,
            name: LocalizedConstants.profileNamePrompt,
            message: LocalizedConstants.profileNamePrompt,
            placeHolder: LocalizedConstants.profileNamePlaceholder,
            default: defaultProfileValues ? defaultProfileValues.profileName : undefined,
            onAnswered: (value) => {
                // Fall back to a default name if none specified
                profile.profileName = value ? value : undefined;
            }
        });
        return prompter.prompt(questions, true).then(answers => {
            if (answers && profile.isValidProfile()) {
                return profile;
            }
            // returning undefined to indicate failure to create the profile
            return undefined;
        });
    }
    // Assumption: having connection string or server + profile name indicates all requirements were met
    isValidProfile() {
        if (this.connectionString) {
            return true;
        }
        if (this.authenticationType) {
            if (this.authenticationType === interfaces_1.AuthenticationTypes[interfaces_1.AuthenticationTypes.Integrated]) {
                return utils.isNotEmpty(this.server);
            }
            else {
                return utils.isNotEmpty(this.server)
                    && utils.isNotEmpty(this.user);
            }
        }
        return false;
    }
}
exports.ConnectionProfile = ConnectionProfile;

//# sourceMappingURL=connectionProfile.js.map
