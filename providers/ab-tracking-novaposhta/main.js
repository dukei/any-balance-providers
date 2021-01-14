/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
    'Accept': '*/*',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
};


function main() {
//если начинается с 1, то 11 цифр
//если с 2  - то сколько угодно
//если с 5  - то 14 цифр
//все остальное международные

    var prefs = AnyBalance.getPreferences();
    var tid = prefs.track_id;
    AnyBalance.trace('Накладная №'+tid);
    if (!tid) throw new AnyBalance.Error('Не указан номер накладной.');
    var re = /((5\d{13})|(1\d{10})|(2\d{6}\d+))/i;
//    if (tid.search(re) <0) tid = tid.replace('-', '');
//    if (tid.search(re) <0) tid = tid.replace(' ', '');
//    if (tid.search(re) <0) tid = tid = tid.replace(/([^A-Za-z0-9])/g, '');
    AnyBalance.setDefaultCharset('utf-8');

if (tid.search(re) >-1) {

    tid = re.exec(tid)[1];
    if (!/^(5\d{13})|(1\d{10})|(2\d{6}\d+)$/i.test(tid)) throw new AnyBalance.Error('Неверный номер накладной.');

    var html = AnyBalance.requestPost('https://api.novaposhta.ua/v2.0/json/', '{\"modelName\":\"TrackingDocument\",\"calledMethod\":\"getStatusDocuments\",\"methodProperties\":{\"Documents\":[{\"DocumentNumber\":\"' + tid + '\",\"Phone\":\"' + encodeURIComponent(prefs.phone) + '\"}]}}', g_headers);
    var json = getJson(html);
    var result=getdata(json,0);

} else {
//Международные?
    var re = /([A-Za-z]{3,4}\d{10,14}[A-Za-z]{0,3})/i;
    if (tid.search(re) != -1) tid=re.exec(tid)[0];
    AnyBalance.trace('Накладная №'+tid);
    if (tid.length < 18) {
        var baseurl = 'https://novaposhta.ua/tracking/international/cargo_number/';
        var html = AnyBalance.requestGet(baseurl + tid, addHeaders({
            Origin: baseurl
        }));
	var result = {success: true};
        result.trackid=tid;
        result.__tariff = getParam(html, null, null, /(?:Маршрут):[\s\S]*?(.*\s\-\s.*)/i, replaceTagsAndSpaces) +' '+ getParam(html, null, null, /(?:Вага відправлення|Вес отправления):[\s\S]*?(\d+\.\d*\sкг)/i, replaceTagsAndSpaces);
        result.more = getParam(html, null, null, /(?:Поточний статус|Текущий статус)[\s\S]*?([\s\S]*)[\s\S]*(Історія статусів)/i, replaceTagsAndSpaces) ;
        var dn=getParam(html, null, null, /(?:Додаткові номери):[\s\S]*?(((5\d{13})|(1\d{10})|(:)|(2\d{6}\d+)))/i, replaceTagsAndSpaces);
        AnyBalance.trace('Дополнительный номер '+dn);
        if (dn&&dn!=':'){
        	var html = AnyBalance.requestPost('https://api.novaposhta.ua/v2.0/json/', '{\"modelName\":\"TrackingDocument\",\"calledMethod\":\"getStatusDocuments\",\"methodProperties\":{\"Documents\":[{\"DocumentNumber\":\"' + dn + '\",\"Phone\":\"' + encodeURIComponent(prefs.phone) + '\"}]}}', g_headers);
        	var json = getJson(html);
        	var r=getdata(json,1);
        	if (r && r.trackid)  result=r;
        }
    }

}

    AnyBalance.setResult(result);
}

function getdata(json, noerr){
    if (json.errors.length > 0) {
        AnyBalance.trace('json.errors.length=' + json.errors.length);
        AnyBalance.trace(json);
        if (noerr==0)        {throw new AnyBalance.Error(json.errors[0])} else {return};
    }
    var d = json.data[0];
//    AnyBalance.trace('d.StatusCode=' + d.StatusCode);
//    if (!d.StatusCode  != 0 && d.StatusCode  != 4 && d.StatusCode  != 41 && d.StatusCode  != 9 && d.StatusCode  != 7  && d.StatusCode  != 6) {
//        AnyBalance.trace('d.StatusCode=' + d.StatusCode);
//        AnyBalance.trace(json);
//        if (noerr==0) { throw new AnyBalance.Error(d.Status)} else {return};
//    }
    var result = {success: true};
    result.trackid = d.Number.replace(/(\d\d)(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
    result.__tariff = (d.DocumentWeight ? d.DocumentWeight + ' кг. ' : '') + d.CargoDescriptionString + (parseBalance(d.AnnouncedPrice) > 0 ? ' (' + d.AnnouncedPrice.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1 ").replace(".", ",") + ' грн.)' : '');
    result.location = d.Status + (d.RecipientDateTime ? ' ' : '') + d.RecipientDateTime;
    result.getdate = parseDate(d.ScheduledDeliveryDate);
    var afterPay = parseBalance(d.AfterpaymentOnGoodsCost);

    var cost = parseBalance(d.DocumentCost);
    var paid = parseBalance(d.AmountPaid);
    if (paid == undefined) paid =0;
    var redelivery = parseBalance(d.RedeliverySum);

    result.payment = afterPay;
    if (d.PayerType == 'Recipient') result.payment = result.payment + cost - paid;
    if (d.RedeliveryPayer == 'Recipient') result.payment += redelivery;

    result.delivery_address = d.RecipientAddress ? d.RecipientAddress : (d.WarehouseRecipient ? d.WarehouseRecipient : undefined);
    re = /(\d\d)(\d{3})(\d{3})(\d\d)(\d\d)/;
    result.getterphone = d.PhoneRecipient ? d.PhoneRecipient.replace(re, '+$1($2)$3-$4-$5') : d.PhoneRecipient;
    result.senderphone = d.PhoneSender ? d.PhoneSender.replace(re, '+$1($2)$3-$4-$5') : d.PhoneSender;
    var more = d.DatePayedKeeping ? "<strong><font  color=\'red\'>Начисление оплаты за хранение с <strong>" + d.DatePayedKeeping.replace(/(\d{4})-(\d\d)-(\d\d)( 00:00:00)/, '$3.$2.$1 </strong></font>') : '';
    var sender = '';
    if (d.SenderFullNameEW) sender = d.SenderFullNameEW;
    if (d.CounterpartySenderDescription) sender += (sender ? ' ' : '') + d.CounterpartySenderDescription;
    if (d.SenderAddress) sender += (sender ? ' ' : '') + d.SenderAddress;
    var cr = '<br><br>';
    if (sender) more += (more ? cr : '') + 'Отправитель:' + sender;
    if (d.RecipientFullNameEW) more += (more ? cr : '') + 'Получатель:' + d.RecipientFullNameEW;
    re = /(\d)(?=(\d{3})+\.)/g;
    if (d.Redelivery != 0 && d.RedeliveryPayer == 'sender' && redelivery > 0) more += (more ? cr : '') + '<strong><font  color=\'red\'>Заказана услуга обратной доставки (<strong>' + redelivery.toFixed(2).replace(re, "$1 ").replace(".", ",") + ' грн. + комиссия.</strong></font>';
    if (afterPay > 0) more += (more ? cr : '') + '<strong><font  color=\'red\'>К оплате за товар: (<strong>' + afterPay.toFixed(2).replace(re, "$1 ").replace(".", ",") + ' грн.</strong></font>';
    if (cost != undefined) more += (more ? cr : '') + ((cost - paid > 0 && d.PayerType == 'Recipient') ? '<font  color=\'red\'>' : '') + 'Стоимость доставки <strong>' + cost.toFixed(2).replace(re, "$1 ").replace(".", ",") + ' грн.</strong> (' + ((d.PayerType != 'Recipient') ? 'Оплачено)' : (paid == 0) ? "Не оплачено)" : 'Оплачено ' + d.PaymentStatusDate + ' ' + d.PaymentStatus + ')' + ((cost - paid > 0 && d.PayerType == 'Recipient') ? '</font>' : ''));
    if (json.warnings.length > 0) more += (more ? cr : '') + "<small>Укажите номер телефона получателя или отправителя, чтобы получить больше информации.</small>"
    if (more) result.more = more;



    return result;
}