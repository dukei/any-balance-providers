// Вспомогательный интерфейс для структуры куки AnyBalance
interface AnyBalanceCookie {
	domain: string;
	name: string;
	value: string;
	[key: string]: any; // Для возможных дополнительных полей куки (path, secure и т.д.)
}

// Интерфейс для возвращаемого объекта из функции SavedData
interface SavedDataInstance {
	getDataObj(): Record<string, any>;
	setCookies(): void;
	restoreCookies(
		filter?: RegExp | ((cookie: AnyBalanceCookie) => boolean)
	): void;
	save(): void;
	set(name: string, value?: any): void;
	get(name: string, defValue?: any): any;
}

/**
 * Сохранение параметров
 */
declare function SavedData(
	provider: string,
	account: string,
	defaultData?: Record<string, any>
): SavedDataInstance;
