/**
 * Выводит сообщение в лог и формирует результат ошибки для API AnyBalance.
 * @param message Сообщение об ошибке
 * @return object Объект ответа с ошибкой
 */
function setError(message) {
    AnyBalance.trace(message);

    return {
        error: true,
        message: message
    }
}

/**
 * Извлекает из исходной строки все вхождения строк между двух маркеров.
 * @param text Исходная строка для поиска
 * @param from Маркер начала строк
 * @param to Марке окончания строк
 * @return Массив с найденными строками
 */
function extractText(text, from, to) {
    var result = [];
    var startPos = text.indexOf(from);
    var endPos = text.indexOf(to, startPos + 1);

    while (startPos > -1 && endPos > -1) {
        result.push(text.substr(startPos, endPos - startPos + to.length));

        startPos = text.indexOf(from, endPos + 1);
        endPos = text.indexOf(to, startPos + 1);
    }

    return result;
}

/**
 * Извлекает часть HTML-кода страницы, содержащую таблицу с данными.
 * @param html Исходный HTML-код страницы
 * @return Извлеченная из кода таблица с данными в HTML
 */
function getTable(html) {
    html = extractText(html, "<form", "</form>");
    return html.length ? html[0] : "";
}

/**
 * Извлекает из таблицы с данными (HTML) все строки.
 * @param table HTML-код таблицы с данными
 * @return Массив найденных строк в HTML
 */
function getRows(table) {
    return extractText(table, "<tr", "</tr>");
}

/**
 * Производит поиск по массиву строк и возвращает значение переданного параметра.
 * @param rows Массив со списком строк в HTML
 * @param parameter Название искомого параметра
 * @param numeric Использовать ли подмену запятой
 * @return Найденное значение, либо пустая строка
 */
function getValue(rows, parameter, numeric) {
    var columns, currentParameter, currentValue, result = "";

    for (var index in rows) {
        columns = extractText(rows[index], "<td", "</td>");

        if (columns.length == 2) {
            currentParameter = columns[0].match(/<div[^>]+>([^<]*)<\/div>/i);
            currentValue = columns[1].match(/<div[^>]+>([^<]*)<\/div>/i);

            if (currentParameter.length && currentValue.length && currentParameter[1] == parameter) {
                result = currentValue[1].replace("\n", "");

                result = result.replace(/^\s+/, "");
                result = result.replace(/\s+$/, "");

                if (numeric) {
                    result = parseFloat(result.replace(",", "."));
                } else {
                    result = htmlEntityDecode(result);
                }

                break;
            }
        }
    }

    return result;
}

/**
 * Преобразует коды HTML символов в "нормальный" вид.
 * @param str Исходная строка для преобразования
 * @return Преобразованная строка
 */
function htmlEntityDecode(str)
{
    var ta = document.createElement('textarea');
    ta.innerHTML = str;
    return ta.value;
}

function main() {
    var result = {};

    AnyBalance.trace("Чтение настроек пользователя...");

    var prefs = AnyBalance.getPreferences();

    AnyBalance.trace("Получено: договор - " + prefs.login + ", пароль - " + prefs.password);

    AnyBalance.trace("Вход в личный кабинет...");
    var info = AnyBalance.requestPost("http://iqtech.org/iq/cabinet.html;jsessionid=", { // TODO: Убрать параметр сессии
        contractId: prefs.login,
        login: "Логин",
        password: prefs.password
    });

    if (info) {
        AnyBalance.trace("Ответ получен. Извлечение данных...");

        if (info = getTable(info)) {
            var error = extractText(info, "<div class=\"error-output-text\">", "</div>");

            if (error.length) {
                error = error[0].match(/<div[^>]+>([^<]*)<\/div>/i);
                result = setError(error[1].replace("\n", ""));
            } else {
                var rows = getRows(info);

                if (rows.length) {
                    AnyBalance.trace("Таблица с данными найдена.");

                    if (AnyBalance.isAvailable("contractNumber")) {
                        AnyBalance.trace("Поиск номера договора...");
                        result.contractNumber = getValue(rows, "Номер договора");
                    }

                    if (AnyBalance.isAvailable("childName")) {
                        AnyBalance.trace("Поиск ФИО...");
                        result.childName = getValue(rows, "Лицо, обслуживаемое по договору");
                    }

                    if (AnyBalance.isAvailable("balanceValue")) {
                        AnyBalance.trace("Поиск баланса...");
                        result.balanceValue = getValue(rows, "Текущий баланс счета", true);
                    }

                    if (AnyBalance.isAvailable("overdraftValue")) {
                        AnyBalance.trace("Поиск овердрафта...");
                        result.overdraftValue = getValue(rows, "Лимит овердрафта", true);
                    }

                    result.success = true;

                    AnyBalance.trace("Все запросы завершены.");
                } else {
                    info = "";
                }
            }
        }

        if (!info) {
            result = setError("Искомые данные не найдены.");
        }
    } else {
        result = setError("Пустой ответ от сайта.");
    }

    AnyBalance.setResult(result);
//    if(!AnyBalance.isSetResultCalled())
//        throw new AnyBalance.Error("");
}