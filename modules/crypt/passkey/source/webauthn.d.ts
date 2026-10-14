// models/webauthn.dto.ts

export interface PubKeyCredParam {
    type: 'public-key';
    alg: number;
}

export interface AuthenticatorSelection {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    residentKey?: 'required' | 'preferred' | 'discouraged';
    userVerification?: 'required' | 'preferred' | 'discouraged';
}

export interface Rp {
    name: string;
    id: string;
}

export interface User {
    name: string;
    displayName: string;
    id: string;
}

// Входные данные от МТС
export interface PublicKeyOptions {
    rp: Rp;
    user: User;
    challenge: string;
    pubKeyCredParams: PubKeyCredParam[];
    timeout?: number;
    authenticatorSelection?: AuthenticatorSelection;
    attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
}

export interface PasskeyRequest {
    publicKey: PublicKeyOptions;
    origin: string
}

// Выходные данные для структуры "arg" МТС
export interface AttestationResponse {
    id: string;
    rawId: string;
    response: {
        attestationObject: string;
        clientDataJSON: string;
        transports: string[];
        publicKeyAlgorithm: number;
        publicKey: string;
        authenticatorData: string;
    };
    type: 'public-key';
    clientExtensionResults: Record<string, any>;
    authenticatorAttachment: 'platform';
}

// Объект, который мы вернем для сохранения приватного ключа в вашем приложении
export interface GeneratedPasskeyResult {
    attestationData: AttestationResponse;
    privateKeyHex: string; // Обязательно сохраните его у себя для последующего входа!
}

// Входные данные для авторизации
export interface LoginChallengeOptions {
    challenge: string;
    timeout?: number;
    rpId: string;
    userVerification?: 'required' | 'preferred' | 'discouraged';
}

export interface LoginChallengeRequest {
    publicKey: LoginChallengeOptions;
    privateKeyHex: string; // Передаем сохраненный на этапе регистрации ключ
    credentialIdB64Url: string; // Идентификатор ключа (id из прошлого ответа)
    origin: string;
    counter: number;
}

// Выходная структура для отправки в "arg" МТС при входе
export interface AssertionResponse {
    id: string;
    rawId: string;
    response: {
        authenticatorData: string;
        clientDataJSON: string;
        signature: string;
        userHandle?: string;
    };
    type: 'public-key';
    clientExtensionResults: Record<string, any>;
    authenticatorAttachment: 'platform';
}

//-------------------------------------

export type SavedKey = {
    key: GeneratedPasskeyResult,
    userHandle: string
}