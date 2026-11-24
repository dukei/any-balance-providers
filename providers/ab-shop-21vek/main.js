/**
 * Провайдер AnyBalance для 21vek.by
 * Финальная версия (API Only).
 */

function main() {
    // Устанавливаем кодировку UTF-8 для правильной обработки JSON
    AnyBalance.setOptions({charset: 'utf-8'});

    var prefs = AnyBalance.getPreferences();
    var email = prefs.login;
    var password = prefs.password;

    if (!email || !password) {
        AnyBalance.setResult({
            success: false, error: true,
            message: 'Не указан Email или пароль в настройках.'
        });
        return;
    }

    try {
        // 1. Авторизация через SSO
        AnyBalance.trace('Выполняем вход через SSO...');
        var authUrl = 'https://gate.21vek.by/sso/login-by-email';
        var payload = JSON.stringify({ email: email, password: password });
        
        AnyBalance.requestPost(authUrl, payload, {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': 'https://www.21vek.by',
            'Referer': 'https://www.21vek.by/'
        });

        var statusCode = AnyBalance.getLastStatusCode();
        if (statusCode === 401 || statusCode === 422 || statusCode === 400) {
            AnyBalance.setResult({
                success: false, error: true, fatal: true,
                message: 'Неверный Email или пароль.'
            });
            return;
        }

        // 2. Запрос к API бонусов
        AnyBalance.trace('Успешный вход. Запрашиваем данные по бонусам...');
        var bonusUrl = 'https://gate.21vek.by/bonus/account';
        var bonusResponse = AnyBalance.requestGet(bonusUrl, {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': 'https://www.21vek.by',
            'Referer': 'https://www.21vek.by/'
        });

        // 3. Парсинг JSON
        var json;
        try {
            json = JSON.parse(bonusResponse);
        } catch (e) {
            AnyBalance.trace('Ошибка парсинга JSON. Ответ сервера: ' + bonusResponse);
            AnyBalance.setResult({
                success: false, error: true,
                message: 'Сервер вернул не JSON.'
            });
            return;
        }

        if (!json || !json.data) {
            AnyBalance.trace('В JSON нет блока "data". Ответ: ' + bonusResponse);
            AnyBalance.setResult({
                success: false, error: true,
                message: 'API вернуло ошибку авторизации.'
            });
            return;
        }

        // 4. Формирование результата
        var result = { success: true };

        if (typeof json.data.balance !== 'undefined') result.balance = json.data.balance;
        if (typeof json.data.discount !== 'undefined') result.discount = json.data.discount;
        if (typeof json.data.purchases_amount !== 'undefined') result.total_sum = json.data.purchases_amount;
        if (typeof json.data.orders_count !== 'undefined') result.orders_count = json.data.orders_count;

        AnyBalance.saveCookies();
        AnyBalance.saveData();

        AnyBalance.trace('Данные успешно обновлены.');
        AnyBalance.setResult(result);

    } catch (e) {
        AnyBalance.trace('Исключение: ' + e.message);
        AnyBalance.setResult({
            success: false, error: true,
            message: 'Ошибка сети: ' + e.message
        });
    }
}