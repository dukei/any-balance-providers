// Типы для библиотеки modules/captcha2 в any-balance-providers
import Dict = NodeJS.Dict;

export interface RuCaptchaClass {
    new(key: string): RuCaptchaClass;

    solveReCaptcha2(sitekey: string, ex: {url: string, userAgent: string}): Promise<string>;

    solveFunCaptcha(sitekey: string, ex: {url: string, userAgent: string, surl: string}): Promise<string>;

    /**
     *
     * @param params - параметры для посылки в рукапча апи
     * @returns captcha_id
     */
    sendToRecognition(params: Dict<any>): Promise<string>;

    waitForResult(captcha_id: string): Promise<string>;
}


//@ts-ignore
const RuCaptcha: RuCaptchaClass = global.RuCaptcha;

export {
    RuCaptcha
}
