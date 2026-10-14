interface AnyBalanceResultError {
    readonly error: true;
    readonly message: string;
    readonly fatal?: boolean;
    readonly allow_retry?: boolean;
    readonly e?: Error;
    readonly investigate?: boolean;
    readonly unhandled?: boolean;
}

interface AnyBalanceResultSuccess {
    readonly success: true
    [name: string]: any
}

type AnyBalanceResult = AnyBalanceResultError | AnyBalanceResultSuccess


interface AnyBalanceInnerApi {
    requestPost(url: string, data: string|StringBundle|ArrayBuffer|null, json: boolean, headers: string|StringBundle|null, options: string|OptionsParam|null): StringCallResponse<AnyResponseInterface>

    getLevel(): StringCallResponse<number>;
    setAuthentication(name: string, pass: string, authParams: string | AnyAuthParams | null): StringCallResponse<void>;
    clearAuthentication(): StringCallResponse<void>;
    setCookie(domain: string, name: string, value: string | null, params: string | AnyCookieExt | null): StringCallResponse<void>
    getCookies(): StringCallResponse<AnyCookie[]>

    setOptions(strOption: string | OptionsParam): PStringCallResponse<void>;

    sleep(ms: number): StringCallResponse<void>;

    getCapabilities(): StringCallResponse<AnyCapabilities>;
}

interface AnyBalanceInnerStorageApi{
    loadData(): StringCallResponse<string>;
    saveData(data: string): StringCallResponse<void>;
}

interface AnyBalanceInnerResultApi{
    setResult(data: string | AnyBalanceResult): StringCallResponse<void>;
}

interface AnyBalanceInnerTraceApi{
    trace(msg: string, callee: string): StringCallResponse<void>;
}

enum AnyRetrieveType {
    CODE= 'CODE',
    IMAGE= 'IMAGE',
    RECAPTCHA = 'RECAPTCHA'
}

interface AnyRetrieveOptions {
    type: AnyRetrieveType,
    prompt?: string,
    time?: number
}

interface AnyRetrieveOptionsCode extends AnyRetrieveOptions {
    inputType?: AnyRetrieveInputType
}

interface AnyRetrieveOptionsImage extends AnyRetrieveOptionsCode {
    image: string
}

interface AnyRetrieveOptionsRecaptcha extends AnyRetrieveOptions {
    url: string
    userAgent?: string
    sitekey: string
    subtype?: 'V2' | 'V3'
    action?: string
}

interface AnyBalanceInnerRetrieveApi{
    retrieveCode(options: string | AnyRetrieveOptions): StringCallResponse<string>;
}

interface AnyBalanceApi {
    Error: new (message: string, ex?: AnyBalanceUserErrorParam) => Error;

    getPreferences(): AnyBalancePreferences;
    /**
     * Возвращает возможности этой реализации API
     */
    getCapabilities(): AnyCapabilities;

    /**
     * returns true if at least one of supplied counters is selected by a user for retrieving
     *
     * @param arrOrString can be string or array of strings
     */
    isAvailable(...arrOrString: string[] | string[][]): boolean;

    /**
     * Set cookie for this session
     * @param domain
     * @param name
     * @param value
     * @param params
     */
    setCookie(domain: string, name: string, value?: string | null, params?: AnyCookieExt): void;

    /**
     * Получает сохраненные при аккаунте данные
     * @param name
     * @param defaultValue
     */
    getData(name: string, defaultValue?: any): any;

    /**
     * Устанавливает сохраняемые при аккаунте данные
     * @param name
     * @param value
     */
    setData(name: string, value?: any): void;

    /**
     * Физически сохраняет все данные в аккаунт, если они были модифицированы
     * @param forceSave
     */
    saveData(forceSave?: boolean): void;

    clearData(): void;

    isDataDirty(): void;

    /**
     * Сохраняет все куки на будущее
     */
    saveCookies(paramName?: string): void;

    /**
     * Восстанавливает все ранее сохраненные куки
     */
    restoreCookies(paramNameOrCookies?: string | AnyCookie[]): void;

    /**
     * Get AnyBalance API version
     */
    getLevel(): number;

    /**
     * Write message to an account log
     * This log can be viewed in AnyBalance program
     * Useful for debugging
     *
     * @param msg - message
     * @param caller - context hint
     */
    trace(msg: string, caller?: string): void;

    requestGet(url: string, headers?: StringBundle | null, options?: OptionsParam | null): string|null;

    /**
     * Sends post request
     * @param url
     * @param data
     * @param headers
     * @param options
     */
    requestPost(url: string, data?: string | ArrayBuffer | StringBundle | null, headers?: StringBundle | null, options?: OptionsParam | null): string|null;

    /**
     * Set authentication parameters for this session
     * These parameters apply for all subsequent requests
     * @param name
     * @param pass
     * @param authscope
     */
    setAuthentication(name: string, pass: string, authscope?: AnyAuthParams): void;

    /**
     * Get all cookies for this session
     */
    getCookies(): AnyCookie[];

    /**
     * Get cookie value by name
     * @param name
     * @param params
     */
    getCookie(name: string, params?: CookieParams): string | false;

    /**
     * retrieves graphical or sms code
     * @param comment
     * @param image
     * @param options
     */
    retrieveCode(options?: AnyRetrieveOptions): string;

    /**
     * Clears authentication parameters in this session
     */
    clearAuthentication(): void;

    /*
     * returns true is setResult has already been called in this session
     */
    isSetResultCalled(): boolean;

    //Sets result of counters retrieval
    //data is object containing all counters
    //you must specify 'success': true or 'error': true for AnyBalance can distinguish results between success and error
    setResult(data: AnyBalanceResult): void;

    /**
     * Sets several options for api
     *
     * @param data {option: value, option: value, ...}
     */
    setOptions(data: OptionsParam): void;

    /**
     * Suspend execution by specified number of milliseconds
     */
    sleep(ms: number): void;

    /**
     * returns array of strings - names of user selected counters in user order
     */
    getAvailableCounters(): string[];

    setDefaultCharset(charset: string): void;

    getLastResponseParameters(): {
        url: string
        status: string
        headers: [string, string][]
    }
    getLastResponseHeader(name: string): string|null
    getLastResponseHeaders(): [string, string][]
    getLastStatusCode(): number
    getLastStatusString(): string
    getLastUrl(): string

    /**
     *  Устанавливает флаг, что логин удался, то есть, последующие вызовы могут использовать залогиненность
     */
    setLoginSuccessful(): void;

    execute(main: () => void): void;

    encodeBase64(buf: ArrayBuffer): string;
    decodeBase64(str: string): ArrayBuffer;
}

type AnyBalancePreferences = {[name: string]: any};

type AnyBalanceParams = {
    preferences?: AnyBalancePreferences,
    signature?: string,
    stringRPC?: (str: string) => string | null,
    api_stringified?: boolean,
    api?: AnyBalanceInnerApi,
    apiStorage?: AnyBalanceInnerStorageApi,
    apiResult?: AnyBalanceInnerResultApi,
    apiTrace?: AnyBalanceInnerTraceApi,
    apiRetrieve?: AnyBalanceInnerRetrieveApi,
    converter_main?: (data: AnyBalanceResult) => AnyBalanceResult,
}

type AnyBalanceUserErrorParam = {allow_retry?: boolean, fatal?: boolean, [name: string]: any};

type CookieParams = {
    path?: string
    domain?: string
    allcookies?: AnyCookie[]
}

enum AnyRetrieveInputType {
    number = 'number',
    text = 'text',
    textPassword = 'textPassword',
    numberPassword = 'numberPassword',
    textEmailAddress = 'textEmailAddress',
}

type AnyCookieBase = {
    name: string
    domain: string
    value?: string
}

type AnyCookieExt = {
    path?: string
    persistent?: boolean
    expires?: string
    secure?: boolean
    httpOnly?: boolean
}

type AnyCookie = AnyCookieBase & AnyCookieExt;

enum OPTIONS {
    OPTIONS = "options", //override to default options
    DEFAULT_CHARSET = "defaultCharset", //default charset for responses
    FORCE_CHARSET = "forceCharset", //forced charset for responses
    REQUEST_CHARSET = "requestCharset", //charset for POST body
    PROXY = "proxy", //https proxy for requests
    SSL_ENABLED_PROTOCOLS = "sslEnabledProtocols", //[string, string,...]
    SSL_ENABLED_PROTOCOLS_ADD = "sslEnabledProtocolsAdd", //[string, string,...]
    SSL_ENABLED_PROTOCOLS_REMOVE = "sslEnabledProtocolsRemove", //[string, string,...]
    SSL_ENABLED_CIPHER_SUITES = "sslEnabledCipherSuites", //[string, string,...]
    SSL_ENABLED_CIPHER_SUITES_ADD = "sslEnabledCipherSuitesAdd", //[string, string,...]
    SSL_ENABLED_CIPHER_SUITES_REMOVE = "sslEnabledCipherSuitesRemove", //[string, string,...]
    PER_DOMAIN = "perDomain", //[{string => {options}, ...]
    HTTP_METHOD = "httpMethod", //POST|GET|PUT|DELETE|OPTIONS|TRACE|HEAD
    MANUAL_REDIRECTS = "manualRedirects", //default false
}

enum HTTP_METHOD {
    GET= 'GET',
    POST = 'POST',
    OPTIONS = 'OPTIONS',
    DELETE = 'DELETE',
    PUT = 'PUT',
    HEAD = 'HEAD',
}

type StringTuple = [string, string]
type StringMap = {[name: string]: string}
type StringBundle = StringTuple[] | StringMap

type OptionsParamSimple = {
    [OPTIONS.DEFAULT_CHARSET]?: string,
    [OPTIONS.FORCE_CHARSET]?: string,
    [OPTIONS.REQUEST_CHARSET]?: string,
    [OPTIONS.HTTP_METHOD]?: HTTP_METHOD,
    [OPTIONS.MANUAL_REDIRECTS]?: boolean,
    [OPTIONS.PROXY]?: string,
    [name: string]: any,
}

type OptionsParam = {
    [OPTIONS.PER_DOMAIN]?: {[domain: string]: OptionsParamSimple},
    [OPTIONS.OPTIONS]?: OptionsParamSimple
} & OptionsParamSimple;

type CallErrorResponse = {
    error: true,
    message: string
}

type CallSuccessResponse<T> = {
    payload: T
}

type CallResponse<T> = CallErrorResponse | CallSuccessResponse<T>;

type StringCallResponse<T> = string | CallResponse<T>;

type AnyCapabilities = {

}

type AnyAuthParams = {

}

interface AnyResponseInterface{
    readonly headers: StringTuple[]
    readonly url: string
    readonly status: string
    readonly body: string | ArrayBuffer
}

declare interface Window {
    AnyBalance: AnyBalanceApi;
}

declare const AnyBalance: AnyBalanceApi;