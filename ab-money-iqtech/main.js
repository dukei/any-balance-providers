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
    };
}

function main() {
    var result = {};

    AnyBalance.trace("Чтение настроек пользователя...");

    var prefs = AnyBalance.getPreferences();

    AnyBalance.trace("Получено: договор - " + prefs.login + ", пароль - " + prefs.password);

    AnyBalance.trace("Вход в личный кабинет...");
    var info = AnyBalance.requestPost("http://obrkarta.ru/auth/", {
        login: prefs.login,
        password: prefs.password
    });

    if (info) {
        var matches;

        AnyBalance.trace("Ответ получен. Извлечение данных...");

        if (AnyBalance.isAvailable("balanceValue")) {
            AnyBalance.trace("Поиск баланса...");

            matches = info.match(/<span[^>]+class="fw-500 ht__cost_mob">([\d\.]+)\s+руб\./i);

            if (matches.length) {
                result.balanceValue = parseFloat(matches[1]);

                AnyBalance.trace("Баланс: " + result.balanceValue + ".");
            } else {
                AnyBalance.trace("Значение баланса не найдено.");
            }
        }

        if (AnyBalance.isAvailable("childName")) {
            AnyBalance.trace("Поиск ФИО...");

            matches = info.match(/<span[^>]+class="sign-in__name"[^>]+title="([^"]+)"/i);

            if (matches.length) {
                result.childName = matches[1].replace(/\s{2,}/, ' ');

                AnyBalance.trace("ФИО: " + result.childName + ".");
            } else {
                AnyBalance.trace("ФИО не найдено.");
            }
        }

        if (AnyBalance.isAvailable("transportCardNumber")) {
            AnyBalance.trace("Загрузка страницы со списком карт...");

            info = AnyBalance.requestGet("http://obrkarta.ru/personal/card/");

            if (info) {
                AnyBalance.trace("Поиск номера транспортной карты...");

                matches = info.match(/<div[^>]+class="table_td">(.+?)<\/div><!--IdOfCard-->/i);

                if (matches.length) {
                    result.transportCardNumber = matches[1];

                    AnyBalance.trace("Hомера транспортной карты: " + result.transportCardNumber + ".");
                } else {
                    AnyBalance.trace("Hомера транспортной карты не найден.");
                }
            } else {
                AnyBalance.trace("Не удалось загрузить данные о картах.");
            }
        }

        result.__tariff = prefs.login;

        result.success = true;

        AnyBalance.trace("Все запросы завершены.");
    } else {
        result = setError("Пустой ответ от сайта.");
    }

    AnyBalance.setResult(result);

//    if(!AnyBalance.isSetResultCalled())
//        throw new AnyBalance.Error("");
}