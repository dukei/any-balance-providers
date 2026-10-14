import {
    PasskeyRequest,
    GeneratedPasskeyResult,
    AssertionResponse,
    LoginChallengeOptions
} from './webauthn'; // Скорректируйте путь к webauthn, если он лежит в другом месте

import { SavedDataInstance } from '@modules/misc/saved-data/source/sd';

// Внутренняя структура сохраненного ключа, которая передается в sd.set() и извлекается в sd.get()
interface SavedKey {
    key: GeneratedPasskeyResult;
    userHandle: string;
    counter: number;
}

interface LoginChallengeParams {
    publicKey: LoginChallengeOptions,
    origin: string
    counter?: number
}

// Интерфейс для возвращаемого инстанса класса Passkey
interface PasskeyInstance {
    generate(data: PasskeyRequest): { attestationData: any }; // В исходном TS/JSDoc возвращается обертка
    saveGeneratedKey(): void;
    login(_data: LoginChallengeParams): AssertionResponse;
    hasKey(): boolean;
    clearKey(): void;
}

/**
 * Генерация и использование PassKey
 */
declare function Passkey(
    sd: SavedDataInstance,
    headers: Record<string, string> | null, // Заменено StringBundle на стандартный Record для гибкости, либо верните StringBundle
    name?: string | null
): PasskeyInstance;

export { Passkey, PasskeyInstance, SavedKey };