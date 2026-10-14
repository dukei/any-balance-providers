// Типы для библиотеки modules/library в any-balance-providers

import {AsyBalanceResultSuccess, AsyCookie} from "../AsyBalance/ABApi";

export type ABReplaces = string|RegExp;
export type ABReplacesArray = (ABReplaces|ABReplaces[])[];
export type ABParser<T> = (str: string) => T;
export type ABAggregate<T,A> = (values: T[]) => A

export type ABDict = {[name: string]: any};
export type ABArray = [string, any][];
export type ABParams = ABDict|ABArray;

export type ABCreateFormParamsCallback = (params: ABDict, str: string, name: string, value?: string) => string|undefined;
export type ABFormattedDateOptions = {
    format: string //'DD.MM.YYYY', // DD=09, D=9, MM=08, М=8, YYYY=2015, YY=15
    offsetDay: number //Смещение по дням
    offsetMonth: number //Смещение по месяцам
    offsetYear: number //Смещение по годам
}

export interface ABLegacy {
    /**
     * Получает значение, подходящее под регулярное выражение regexp, производит
     * в нем замены replaces, результат передаёт в функцию parser,
     * а затем записывает результат в счетчик с именем param в result
     * Результат в result помещается только если счетчик выбран пользователем
     * в настройках аккаунта
     *
     * если result и param равны null, то значение просто возвращается.
     * eсли parser == null, то возвращается результат сразу после замен
     * если replaces == null, то замены не делаются
     *
     * replaces - массив, нечетные индексы - регулярные выражения, четные - строки,
     * на которые надо заменить куски, подходящие под предыдущее регулярное выражение
     * массивы могут быть вложенными
     * см. например replaceTagsAndSpaces
     */
    getParam<T=string>(html: string|null|undefined, result: AsyBalanceResultSuccess, param: string, regexp: RegExp|null, replaces?: ABReplacesArray|null, parser?: ABParser<T>): T;
    getParam<T=string>(html: string|null|undefined, regexp: RegExp, replaces?: ABReplacesArray|null, parser?: ABParser<T>): T;

    /**
     * Получает значение, подходящее под регулярное выражение regexp, производит
     * в нем замены replaces, результат передаёт в функцию parser,
     * а затем записывает результат в счетчик с именем param в result
     * Результат в result помещается только если счетчик выбран пользователем
     * в настройках аккаунта
     *
     * Очень похоже на getParam, но может получать несколько значений (при наличии
     * в регулярном выражении флага g). В этом случае применяет к ним функцию aggregate,
     * а если она не передана, то возвращает массив всех совпадений.
     *
     * если result и param равны null, то значение просто возвращается.
     * eсли parser == null, то возвращается результат сразу после замен
     * если regexp == null, то значением является переданный html
     * если replaces == null, то замены не делаются
     * do_replace - если true, то найденные значения вырезаются из переданного текста
     * и новый текст возвращается (только при param != null)
     *
     * replaces - массив, нечетные индексы - регулярные выражения, четные - строки,
     * на которые надо заменить куски, подходящие под предыдущее регулярное выражение. Эти массивы могут быть вложенными.
     * см. например replaceTagsAndSpaces
     */
    sumParam<T=string,A=string[]>(html: string|null|undefined, result: AsyBalanceResultSuccess, param: string, regexp: RegExp|null, replaces: ABReplacesArray|null, parser: ABParser<T>|null, do_replace: boolean, aggregate?: ABAggregate<T,A>): A
    sumParam<T=string,A=string[]>(html: string|null|undefined, result: AsyBalanceResultSuccess, param: string, regexp: RegExp|null, replaces: ABReplacesArray|null, parser: ABParser<T>|null, aggregate?: ABAggregate<T,A>, do_replace?: boolean): A
    sumParam<T=string,A=string[]>(html: string|null|undefined, regexp: RegExp|null, replaces: ABReplacesArray|null, parser: ABParser<T>|null, aggregate?: ABAggregate<T,A>): A

    createUrlEncodedParams(params: ABParams): string
    addHeaders(newHeaders: ABParams, oldHeaders: ABParams): ABParams
    joinObjects(newObject: ABDict, oldObject: ABDict): ABDict
    joinUrl(baseurl: string, relative: string): string
    getElement<T=string>(html: string, el: RegExp, replaces?: ABReplacesArray|null, parser?: ABParser<T>): T
    getElements<T=string>(html: string, el: RegExp, replaces?: ABReplacesArray|null, parser?: ABParser<T>): T[]

    createFormParams(form: string, processor?: ABCreateFormParamsCallback|null, array?: false): ABDict
    createFormParams(form: string, processor: ABCreateFormParamsCallback|null, array: true): ABArray

    parseBalance(text: string|undefined): number
    parseDate(text: string): number
    parseDateISO(text: string): number


    /**
     * Преобразует число в двухсимвольную строку, дополняя ведущим нулём по необходимости
     * @param {int} n
     * @returns {string}
     */
    n2(n: number): string

    /**
     * Форматирует дату, как необходимо, при этом предоставляет возможность сместиться от передаваемой даты на заданное время. Полезно использовать при передаче в запросы, требующие указания интервалов дат.
     *
     * @param {Object|String} options - формат и смещение
     * @param [dt=new Date()]
     * @returns {String}
     *
     *  Пример параметра options:
     *  <pre>
     *  {
     *      format: 'DD.MM.YYYY', // DD=09, D=9, MM=08, М=8, YYYY=2015, YY=15
     *      offsetDay: 0, // Смещение по дням
     *      offsetMonth: 0, // Смещение по месяцам
     *      offsetYear: 5, // Смещение по годам
     *  }
     *  </pre>
     *
     */
    getFormattedDate(options?: ABFormattedDateOptions|string, dt?: Date): string

    replaceHtmlEntities: ABReplacesArray
    replaceTagsAndSpaces: ABReplacesArray
}

//@ts-ignore
const ABLibrary: ABLegacy = global.AB;

declare global {
    const AB: ABLegacy;
}

export {
    ABLibrary as AB
}
