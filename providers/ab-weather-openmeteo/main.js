var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};

function main() {
    var prefs = AnyBalance.getPreferences();

    // Установка координат Москвы по умолчанию
    if (!prefs.latitude) {
        prefs.latitude = '55.7558'; // Широта Москвы
    }
    if (!prefs.longitude) {
        prefs.longitude = '37.6173'; // Долгота Москвы
    }

    // Получаем данные от Open-Meteo
    var result = getWeatherFromOpenMeteo(prefs);

    AnyBalance.setResult(result);
}

function getWeatherFromOpenMeteo(prefs) {
    var baseurl = 'https://api.open-meteo.com/v1/forecast';
    var params = {
        latitude: prefs.latitude,
        longitude: prefs.longitude,
        current_weather: true,
        hourly: 'temperature_2m,relativehumidity_2m,pressure_msl,windspeed_10m,winddirection_10m,precipitation,cloudcover,visibility,uv_index',
        daily: 'sunrise,sunset,precipitation_sum,precipitation_hours',
        timezone: 'auto'
    };

    var html = AnyBalance.requestGet(baseurl + '?' + createUrlEncodedParams(params), addHeaders({
        Referer: baseurl,
        'Accept-Encoding': 'identity' // Отключаем сжатие
    }));

    // Проверяем, что ответ является JSON
    if (!html.startsWith('{') && !html.startsWith('[')) {
        AnyBalance.trace('Ответ от API не является JSON: ' + html);
        throw new AnyBalance.Error('Сервер вернул некорректные данные. Попробуйте позже.');
    }

    var json = getJson(html);

    var result = {success: true};

    // Город (по умолчанию Москва)
    getParam(prefs.city || 'Москва', result, '__tariff');

    // Текущая погода
    var currentWeather = json.current_weather;
    if (currentWeather) {
        // Температура
        getParam(currentWeather.temperature, result, 'temperature', null, null, parseFloat);
        
        // Скорость ветра (уже в м/с)
        getParam(currentWeather.windspeed, result, 'wind', null, null, parseFloat);
        
        // Направление ветра
        getParam(currentWeather.winddirection, result, 'windDirection', null, null, parseFloat);
    }

    // Давление (преобразуем из hPa в мм рт. ст.)
    var pressureHpa = json.hourly.pressure_msl[0]; // Берем первое значение из hourly
    if (pressureHpa) {
        var pressureMmHg = pressureHpa * 0.750062; // Преобразуем в мм рт. ст.
        getParam(pressureMmHg, result, 'pressure', null, null, parseFloat);
    }

    // Влажность
    getParam(json.hourly.relativehumidity_2m[0], result, 'humidity', null, null, parseFloat);

    // Осадки
    getParam(json.hourly.precipitation[0], result, 'precipitation', null, null, parseFloat);

    // Облачность
    getParam(json.hourly.cloudcover[0], result, 'cloudiness', null, null, parseFloat);

    // Видимость (в метрах)
    getParam(json.hourly.visibility[0], result, 'visibility', null, null, parseFloat);

    // УФ-индекс
    getParam(json.hourly.uv_index[0], result, 'uvIndex', null, null, parseFloat);

      // Восход и закат
    var dailyData = json.daily;
    if (dailyData) {
        getParam(dailyData.sunrise[0], result, 'rising', null, null, parseDateISO);
        getParam(dailyData.sunset[0], result, 'setting', null, null, parseDateISO);
    }

    // Сумма осадков за день
    getParam(dailyData.precipitation_sum[0], result, 'precipitationSum', null, null, parseFloat);

    // Часы с осадками
    getParam(dailyData.precipitation_hours[0], result, 'precipitationHours', null, null, parseFloat);

    return result;
}

// Функция для преобразования времени из формата ISO 8601 в формат HH:mm
function parseTimeISO(time) {
    if (!time) return null;
    var date = new Date(time);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    return (hours < 10 ? '0' + hours : hours) + ':' + (minutes < 10 ? '0' + minutes : minutes);
}