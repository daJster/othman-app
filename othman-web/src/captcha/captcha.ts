// module
const {RecaptchaEnterpriseServiceClient} = require('@google-cloud/recaptcha-enterprise');

/**
 * Créez une évaluation pour analyser le risque d'une action dans l'interface utilisateur.
 *
 * projectID: L'ID de votre projet Google-Cloud.
 * recaptchaSiteKey: La clé reCAPTCHA associée au site ou à l'application
 * token: Jeton généré auprès du client.
 * recaptchaAction: Nom d'action correspondant au jeton.
 */
export const createAssessment = async ({
                                    projectID = "othman-meetings",
                                    recaptchaKey = "6LeiSp0sAAAAAPn-mIrwEe66kbClm5349r7dWn9U",
                                    token = "action-token",
                                    recaptchaAction = "action-name",
                                })=> {
    const client = new RecaptchaEnterpriseServiceClient();
    const projectPath = client.projectPath(projectID);

    const request = ({
        assessment: {
            event: {
                token: token,
                siteKey: recaptchaKey,
            },
        },
        parent: projectPath,
    });

    const [ response ] = await client.createAssessment(request);

    if (!response.tokenProperties.valid) {
        console.log(`The CreateAssessment call failed because the token was: ${response.tokenProperties.invalidReason}`);
        return null;
    }

    // Vérifiez si l'action attendue a été exécutée.
    // The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
    if (response.tokenProperties.action === recaptchaAction) {
        // Obtenez le score de risques et le ou les motifs.
        // Pour savoir comment interpréter l'évaluation, consultez les pages suivantes :
        // https://cloud.google.com/recaptcha/docs/interpret-assessment
        console.log(`The reCAPTCHA score is: ${response.riskAnalysis.score}`);
        response.riskAnalysis.reasons.forEach((reason) => {
            console.log(reason);
        });

        return response.riskAnalysis.score;
    } else {
        console.log("The action attribute in your reCAPTCHA tag does not match the action you are expecting to score");
        return null;
    }
}