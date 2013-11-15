var MAX_TRAINS_COUNTERS = 3;

function main () {
    var trainCounters = [];
    //Получим настройки аккаунта
    var prefs = AnyBalance.getPreferences();
    var url ="http://rasp.yandex.ru/search/suburban/?fromName=" +
             encodeURIComponent(prefs.station_from) + "&toName=" +
             encodeURIComponent(prefs.station_to);
    
    
    //Получаем значения счетчиков
    //что-то для этого делаем
    var strGet = AnyBalance.requestGet(url);
    var trainRows = getTrainTableRows(strGet);
    
    if (trainRows.length == 0) {
        AnyBalance.setResult({
            error: true,
            message: "не найдена информация о поездах"
        });
        return;
    }

    var numResults = Math.min(trainRows.length, MAX_TRAINS_COUNTERS);

    var result = {success: true};

    for (var t = 0; t < numResults; t++) {
        result['train' + t] = getTrainDepartureTime(trainRows[t]);
    }
    //Возвращаем результат
    AnyBalance.setResult(result);
}
/**
 * returns an array of table rows with train information
 * @param  {text} inputText html to parse
 * @return {array} array of text strings representing each table row
 */
function getTrainTableRows(inputText)
{
    var result = [];
    var re = /<tr class="b-timetable__row b-timetable__row_sortable_yes i-bem".+?<\/tr>/g;
    for (var i = 0; i < MAX_TRAINS_COUNTERS; i++) {
        var row = re.exec(inputText);
        if (row === null) {
            break;
        }
        else {
            result[result.length] = row[0];
        }
    }
    return result;
}

function getTrainDepartureTime (inputText) 
{
    var re = /<td class="b-timetable__cell.+?b-timetable__cell_type_departure".+?<strong>.+?<\/strong>/;
    var cell = re.exec(inputText);
    if (cell === null) {
        return "н/д";
    }
    else {
        var express = isExpress(inputText) ? " (э)" : "";
        return /<strong>.+?<\/strong>/.exec(cell[0])[0].substr(8,5) + express;
    }
}

function isExpress(inputText)
{
    return inputText.indexOf("b-timetable__express") >= 0;
}