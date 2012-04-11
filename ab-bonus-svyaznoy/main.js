/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ОПИСАНИЕ

Сайт магазина: http://svyaznoy.ru
Личный кабинет: http://www.sclub.ru/
*/

function main () {
    if (AnyBalance.getLevel () < 3) {
        throw new AnyBalance.Error ('Для этого провайдера необходима версия программы не ниже 1.2.436. Пожалуйста, обновите программу.');
    }

    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.sclub.ru/';

    checkEmpty (prefs.login, 'Введите № карты');
    checkEmpty (prefs.password, 'Введите пароль');

    // Разлогин для отладки
    //AnyBalance.requestGet ('http://www.sclub.ru/LogOut.aspx');

    // Необходимо для формирования cookie
    AnyBalance.requestGet ('http://www.sclub.ru');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var html = AnyBalance.requestPost ('https://www.sclub.ru/Login.aspx', '\
------WebKitFormBoundaryN9pwpLSzn7ZhDqXX\r\n\
Content-Disposition: form-data; name="__VIEWSTATE"\r\n\
\r\n\
/wEPDwULLTE2NDIyOTEzMjkPZBYGZg8WAh4EVGV4dAUPPCFET0NUWVBFIGh0bWw+ZAIBD2QWDgIEDxYCHgdWaXNpYmxlaGQCBQ8WAh4HY29udGVudAUX0KHQstGP0LfQvdC+0Lkt0JrQu9GD0LFkAgYPFgIfAgUX0KHQstGP0LfQvdC+0Lkt0JrQu9GD0LFkAgcPFgIfAgUhKNGBKSAyMDA4INCh0LLRj9C30L3QvtC5INCa0LvRg9CxZAIIDxYEHwJkHwFoZAIJDxYCHwIFF9Ch0LLRj9C30L3QvtC5LdCa0LvRg9CxZAIMDxYCHwIFDUlOREVYLCBGT0xMT1dkAgIPZBYCAgIPZBYGZg9kFgJmDxYCHwFoFgJmD2QWAmYPZBYGAgMPEGRkFgBkAg8PZBYCZg8PFgYeCEltYWdlVXJsBRQvaW1hZ2VzL2NvbGxhcHNlLmdpZh4NQWx0ZXJuYXRlVGV4dAUc0JzQuNC90LjQvNC40LfQuNGA0L7QstCw0YLRjB4HVG9vbFRpcAUc0JzQuNC90LjQvNC40LfQuNGA0L7QstCw0YLRjBYKHgd1c2VyY3RyBQlVc2FiaWxpdHkeB3VzZXJrZXkFFENvbnRyb2xQYW5lbFZpc2libGUzHgdvbmNsaWNrBU1pZiAoX19kbm5fU2VjdGlvbk1heE1pbih0aGlzLCAgJ0ljb25CYXIuYXNjeF9yb3dDb250cm9sUGFuZWwnKSkgcmV0dXJuIGZhbHNlOx4IbWF4X2ljb24FEi9pbWFnZXMvZXhwYW5kLmdpZh4IbWluX2ljb24FFC9pbWFnZXMvY29sbGFwc2UuZ2lmZAIRD2QWAgIBD2QWAgIBD2QWEAIBDxBkZBYAZAIFDxBkZBYAZAIHDxBkZBYAZAILDxBkZBYAZAIPDxBkZBYAZAIVDxBkZBYAZAIZDxBkZBYBZmQCHQ8QZGQWAGQCBQ9kFgJmD2QWBgIED2QWAgIBD2QWAmYPFgIfAWhkAgYPZBYCAgEPZBYCAgEPFgIfAWhkAggPZBYGAgIPZBYCZg9kFgICAQ8PZBYCHgVjbGFzcwUfQ2xpZW50U2l0ZV9CaWdCYW5uZXJWaWV3Q29udGVudBYCAgEPZBYCAgEPZBYCAgEPFgIeC18hSXRlbUNvdW50AgQWCGYPZBYCZg8VAbACPGEgaHJlZj0iL1BvcnRhbHMvQ2xpZW50U2l0ZS9pbWFnZXMvYmFubmVycy9iYW5uZXJfc2JhbmtfdnNlbmFwcmF2bGVuaXlhXzk4MFg0NDAuanBnIiBiYW5uZXJJZD0iMTIxIj4NCjxpbWcgc3JjPSIvUG9ydGFscy9DbGllbnRTaXRlL2ltYWdlcy9iYW5uZXJzL3NtYWxsL2Jhbm5lcl9zYmFua192c2VuYXByYXZsZW5peWFfOTgwWDQ0MC5qcGciIHRpdGxlPSIiIGxvbmdkZXNjPSIuL0FjdGlvbi5hc3B4P2lkPTIwMTIzMCIgYWx0PSIiIGNsYXNzPSIiPg0KPC9hPg0KPCEtLTxkaXY+Q29udGVudCBvdmVyIHRoZSBpbWFnZTwvZGl2Pi0tPmQCAQ9kFgJmDxUBnAI8YSBocmVmPSIvUG9ydGFscy9DbGllbnRTaXRlL2ltYWdlcy9iYW5uZXJzL2Jhbm5lcl9vZG5va2xhc3NuaWtpXzk4MHg0NDAuanBnIiBiYW5uZXJJZD0iMTIyIj4NCjxpbWcgc3JjPSIvUG9ydGFscy9DbGllbnRTaXRlL2ltYWdlcy9iYW5uZXJzL3NtYWxsL2Jhbm5lcl9vZG5va2xhc3NuaWtpXzk4MHg0NDAuanBnIiB0aXRsZT0iIiBsb25nZGVzYz0iL29kbm9rbGFzc25pa2kuYXNweCIgYWx0PSIiIGNsYXNzPSIiPg0KPC9hPg0KPCEtLTxkaXY+Q29udGVudCBvdmVyIHRoZSBpbWFnZTwvZGl2Pi0tPmQCAg9kFgJmDxUBlQI8YSBocmVmPSIvUG9ydGFscy9DbGllbnRTaXRlL2ltYWdlcy9iYW5uZXJzL2Jhbm5lcl9wYXJ0ZXIyXzk4MHg0NDAuanBnIiBiYW5uZXJJZD0iMTIzIj4NCjxpbWcgc3JjPSIvUG9ydGFscy9DbGllbnRTaXRlL2ltYWdlcy9iYW5uZXJzL3NtYWxsL2Jhbm5lcl9wYXJ0ZXIyXzk4MHg0NDAuanBnIiB0aXRsZT0iIiBsb25nZGVzYz0iL0FjdGlvbi5hc3B4P2lkPTIwMTUxOCIgYWx0PSIiIGNsYXNzPSIiPg0KPC9hPg0KPCEtLTxkaXY+Q29udGVudCBvdmVyIHRoZSBpbWFnZTwvZGl2Pi0tPg0KZAIDD2QWAmYPFQGkAjxhIGhyZWY9Ii9Qb3J0YWxzL0NsaWVudFNpdGUvaW1hZ2VzL2Jhbm5lcnMvYmFubmVyX2VudGVyXzk4MHg0NDAuanBnIiBiYW5uZXJJZD0iMTI1Ij4NCjxpbWcgc3JjPSIvUG9ydGFscy9DbGllbnRTaXRlL2ltYWdlcy9iYW5uZXJzL3NtYWxsL2Jhbm5lcl9lbnRlcl85ODB4NDQwLmpwZyIgdGl0bGU9IiIgbG9uZ2Rlc2M9Ii9Sb290L1BhcnRuZXJzL1BhcnRuZXJDYXJkLmFzcHg/cGNhcmQ9MTE3MjYiIGFsdD0iIiBjbGFzcz0iIj4NCjwvYT4NCjwhLS08ZGl2PkNvbnRlbnQgb3ZlciB0aGUgaW1hZ2U8L2Rpdj4tLT5kAgQPZBYCZg9kFgICAQ8PZBYCHwsFI0NsaWVudFNpdGVfVXNlUG9pbnRzUm9vdFZpZXdDb250ZW50FgICAQ9kFgICAg8WAh4JaW5uZXJodG1sBZQYPGRpdiBjbGFzcz0iYnBfcHJvZHVjdHMiPjxkaXYgY2xhc3M9ImJwX2Nhcm91c2VsMSBoMjkwIj48dWw+PGxpPjxkaXYgY2xhc3M9ImJwX2Jhbm5lciI+PGgzPtCSINC80LDQs9Cw0LfQuNC90LDRhSDCq9Cc0LDQs9C90L7Qu9C40Y/CuzwvaDM+PGEgaHJlZj0iL1Jvb3QvUGFydG5lcnMvUGFydG5lckNhcmQuYXNweD9wY2FyZD0xMDIwMCI+PGltZyBzcmM9Ii9Qb3J0YWxzL0NsaWVudFNpdGUvaW1hZ2VzL2FjdGlvbnMvZGFzaGJvYXJkcHJvZHVjdHMvc29fc2tpZGtveS1tYWdub2xpeWEuanBnIiAvPjxiciAvPjwvYT48L2Rpdj48L2xpPjxsaT48ZGl2IGNsYXNzPSJicF9iYW5uZXIiPjxoMz7QkiDQvNCw0LPQsNC30LjQvdCw0YUgwqvQkNCy0YLQvtC80LDQs8K7PC9oMz48YSBocmVmPSIvUm9vdC9QYXJ0bmVycy9QYXJ0bmVyQ2FyZC5hc3B4P3BjYXJkPTExNDQwIj48aW1nIHNyYz0iL1BvcnRhbHMvQ2xpZW50U2l0ZS9pbWFnZXMvYWN0aW9ucy9kYXNoYm9hcmRwcm9kdWN0cy9zb19za2lka295LWF2dG9tYWcuanBnIiAvPjxiciAvPjwvYT48L2Rpdj48L2xpPjxsaT48ZGl2IGNsYXNzPSJicF9iYW5uZXIiPjxoMz7QkiDRgdC10YLQuCDQutCw0YTQtSDCq9Co0L7QutC+0LvQsNC00L3QuNGG0LDCuzwvaDM+PGEgaHJlZj0iL1Jvb3QvUGFydG5lcnMvUGFydG5lckNhcmQuYXNweD9wY2FyZD0xMDE5OCI+PGltZyBzcmM9Ii9Qb3J0YWxzL0NsaWVudFNpdGUvaW1hZ2VzL2FjdGlvbnMvZGFzaGJvYXJkcHJvZHVjdHMvc29fc2tpZGtveS1zaG9rby5qcGciIC8+PGJyIC8+PC9hPjwvZGl2PjwvbGk+PC91bD48ZGl2IGNsYXNzPSJicF9jX3ByZXYxIGNhcnVzZWxfYnV0dG9uIGJwX3ByZXZfYnV0dG9uIGNhcnVzZWxfYnV0dG9uX2wiPjwvZGl2PjxkaXYgY2xhc3M9ImJwX2NfbmV4dDEgY2FydXNlbF9idXR0b24gYnBfbmV4dF9idXR0b24gY2FydXNlbF9idXR0b25fciI+PC9kaXY+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz0iYnBfcHJvZHVjdHMiPjxkaXYgY2xhc3M9ImJwX2Nhcm91c2VsMiBoMjkwIj48dWw+PGxpPjxkaXYgY2xhc3M9ImJwX2Jhbm5lciI+PGgzPtCSINGB0LXRgtC4INC60LDRhNC1IMKr0JLQsNCx0Lgg0KHQsNCx0LjCuzwvaDM+PGEgaHJlZj0iL1Jvb3QvUGFydG5lcnMvUGFydG5lckNhcmQuYXNweD9wY2FyZD0xMTI3NSI+PGltZyBzcmM9Ii9Qb3J0YWxzL0NsaWVudFNpdGUvaW1hZ2VzL2FjdGlvbnMvZGFzaGJvYXJkcHJvZHVjdHMvc29fc2tpZGtveS12YWJpc2FiaS5qcGciIC8+PGJyIC8+PC9hPjwvZGl2PjwvbGk+PGxpPjxkaXYgY2xhc3M9ImJwX2Jhbm5lciI+PGgzPtCSINC80LDQs9Cw0LfQuNC90LDRhSDCq9Cc0LDQs9C90L7Qu9C40Y/CuzwvaDM+PGEgaHJlZj0iL1Jvb3QvUGFydG5lcnMvUGFydG5lckNhcmQuYXNweD9wY2FyZD0xMDIwMCI+PGltZyBzcmM9Ii9Qb3J0YWxzL0NsaWVudFNpdGUvaW1hZ2VzL2FjdGlvbnMvZGFzaGJvYXJkcHJvZHVjdHMvc29fc2tpZGtveS1tYWdub2xpeWEyLmpwZyIgLz48YnIgLz48L2E+PC9kaXY+PC9saT48bGk+PGRpdiBjbGFzcz0iYnBfYmFubmVyIj48aDM+0JIg0YHQsNC70L7QvdCw0YUgwqvQodCy0Y/Qt9C90L7QucK7PC9oMz48YSBocmVmPSIvUm9vdC9QYXJ0bmVycy9QYXJ0bmVyQ2FyZC5hc3B4P3BjYXJkPTEwMDEzIj48aW1nIHNyYz0iL1BvcnRhbHMvQ2xpZW50U2l0ZS9pbWFnZXMvYWN0aW9ucy9kYXNoYm9hcmRwcm9kdWN0cy9zb19za2lka295LXN2eWF6bm95LmpwZyIgLz48YnIgLz48L2E+PC9kaXY+PC9saT48bGk+PGRpdiBjbGFzcz0iYnBfYmFubmVyIj48aDM+0JIg0LDQv9GC0LXQutCw0YUgwqvQoNC40LPQu9Cwwrs8L2gzPjxhIGhyZWY9Ii9Sb290L1BhcnRuZXJzL1BhcnRuZXJDYXJkLmFzcHg/cGNhcmQ9MTEzNDEiPjxpbWcgc3JjPSIvUG9ydGFscy9DbGllbnRTaXRlL2ltYWdlcy9hY3Rpb25zL2Rhc2hib2FyZHByb2R1Y3RzL3NvX3NraWRrb3ktcmlnbGEyLmpwZyIgLz48YnIgLz48L2E+PC9kaXY+PC9saT48L3VsPjxkaXYgY2xhc3M9ImJwX2NfcHJldjIgY2FydXNlbF9idXR0b24gYnBfcHJldl9idXR0b24gY2FydXNlbF9idXR0b25fbCI+PC9kaXY+PGRpdiBjbGFzcz0iYnBfY19uZXh0MiBjYXJ1c2VsX2J1dHRvbiBicF9uZXh0X2J1dHRvbiBjYXJ1c2VsX2J1dHRvbl9yIj48L2Rpdj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJicF9wcm9kdWN0cyI+PGRpdiBjbGFzcz0iYnBfY2Fyb3VzZWwzIGgyOTAiPjx1bD48bGk+PGRpdiBjbGFzcz0iYnBfYmFubmVyIj48aDM+0JIg0LDQv9GC0LXQutCw0YUgwqvQoNC40LPQu9Cwwrs8L2gzPjxhIGhyZWY9Ii9Sb290L1BhcnRuZXJzL1BhcnRuZXJDYXJkLmFzcHg/cGNhcmQ9MTEzNDEiPjxpbWcgc3JjPSIvUG9ydGFscy9DbGllbnRTaXRlL2ltYWdlcy9hY3Rpb25zL2Rhc2hib2FyZHByb2R1Y3RzL3NvX3NraWRrb3ktcmlnbGEuanBnIiAvPjxiciAvPjwvYT48L2Rpdj48L2xpPjxsaT48ZGl2IGNsYXNzPSJicF9iYW5uZXIiPjxoMz7QkiDRgdC10YLQuCDQutCw0YTQtSDCq9Co0L7QutC+0LvQsNC00L3QuNGG0LDCuzwvaDM+PGEgaHJlZj0iL1Jvb3QvUGFydG5lcnMvUGFydG5lckNhcmQuYXNweD9wY2FyZD0xMDE5OCI+PGltZyBzcmM9Ii9Qb3J0YWxzL0NsaWVudFNpdGUvaW1hZ2VzL2FjdGlvbnMvZGFzaGJvYXJkcHJvZHVjdHMvc29fc2tpZGtveS1zaG9rbzIuanBnIiAvPjxiciAvPjwvYT48L2Rpdj48L2xpPjxsaT48ZGl2IGNsYXNzPSJicF9iYW5uZXIiPjxoMz7QkiDRgdCw0LvQvtC90LDRhSDCq9Ch0LLRj9C30L3QvtC5wrs8L2gzPjxhIGhyZWY9Ii9Sb290L1BhcnRuZXJzL1BhcnRuZXJDYXJkLmFzcHg/cGNhcmQ9MTAwMTMiPjxpbWcgc3JjPSIvUG9ydGFscy9DbGllbnRTaXRlL2ltYWdlcy9hY3Rpb25zL2Rhc2hib2FyZHByb2R1Y3RzL3NvX3NraWRrb3ktc3Z5YXpub3kyLmpwZyIgLz48YnIgLz48L2E+PC9kaXY+PC9saT48L3VsPjxkaXYgY2xhc3M9ImJwX2NfcHJldjMgY2FydXNlbF9idXR0b24gYnBfcHJldl9idXR0b24gY2FydXNlbF9idXR0b25fbCI+PC9kaXY+PGRpdiBjbGFzcz0iYnBfY19uZXh0MyBjYXJ1c2VsX2J1dHRvbiBicF9uZXh0X2J1dHRvbiBjYXJ1c2VsX2J1dHRvbl9yIj48L2Rpdj48L2Rpdj48L2Rpdj5kAgYPZBYCZg9kFgICAQ8PZBYCHwsFMENsaWVudFNpdGVfQWNjdW11bGF0ZVBvaW50c1BvaW50c1Jvb3RWaWV3Q29udGVudGQCCw8UKwACZGRkZN83gQYyfvoJIHiP0EIh4yflLnOA\r\n\
------WebKitFormBoundaryN9pwpLSzn7ZhDqXX\r\n\
Content-Disposition: form-data; name="dnn$Login1$ctlContentLogin$tbUserName"\r\n\
\r\n\
' + prefs.login + '\r\n\
------WebKitFormBoundaryN9pwpLSzn7ZhDqXX\r\n\
Content-Disposition: form-data; name="dnn$Login1$ctlContentLogin$tbUserPassword"\r\n\
\r\n\
' + prefs.password + '\r\n\
------WebKitFormBoundaryN9pwpLSzn7ZhDqXX\r\n\
Content-Disposition: form-data; name="dnn$Login1$ctlContentLogin$LoginBtn"\r\n\
\r\n\
Ð’Ð¾Ð¹Ñ‚Ð¸\r\n\
------WebKitFormBoundaryN9pwpLSzn7ZhDqXX--\r\n\
',
    {
        "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryN9pwpLSzn7ZhDqXX"
    });

//    // Редирект при необходимости
//    var regexp = /window.location.replace\("([^"]*)"\)/;
//    var res = regexp.exec (html);
//    if (res)
//        html = AnyBalance.requestGet (res[1]);

    // Проверка неправильной пары логин/пароль
    var regexp=/class="[^"]*(?:error-authorization|loginerror)[^"]*"[^>]*>([^<]*)/;
    var res = regexp.exec (html);
    if (res)
        throw new AnyBalance.Error (res[1]);

    // Редирект при необходимости
    var regexp = /window.location.replace\("([^"]*)"\)/;
    var res = regexp.exec (html);
    if (res)
        html = AnyBalance.requestGet (res[1]);

    // Проверка на корректный вход
    regexp = /'\/LogOut.aspx'/;
    if (regexp.exec (html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logout... Unknown error. Please contact author.');
        AnyBalance.trace (html);
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }

    var result = {success: true};

    // Владелец
    getParam (html, result, 'customer', /<a href="\/YourAccountMain.aspx">\s*<span>\s*([^<]*?)\s*</i);

    // Баланс в баллах
    getParam (html, result, 'balanceinpoints', /CurrentBalance: '(\d*)/i, [], parseInt);

    // Баланс в рублях
    getParam (html, result, 'balanceinrubles', /\(скидка (\d*)/i, [], parseInt);

    // Количество сообщений
    getParam (html, result, 'messages', /title="Мои сообщения">.*?<span>(\d*)/i, [], parseInt);


    if (AnyBalance.isAvailable ('cardnumber',
                                'pointsinlastoper')) {

        AnyBalance.trace ('Fetching account info...');

        html = AnyBalance.requestGet (baseurl + 'YourAccountMain.aspx');

        AnyBalance.trace ('Parsing account info...');
    
        // Номер карты
        getParam (html, result, 'cardnumber', /Номер карты: <nobr>([^<]*)/i);
    
        // Баллы по последней операции
        getParam (html, result, 'pointsinlastoper', /<td class="((?:positiv|negativ)-points"><span>\d*)/i, [/(positiv|negativ)-points"><span>(\d*)/, '$1$2', 'positiv', '+', 'negativ', '-']);
    }


    if (AnyBalance.isAvailable ('cardstate')) {

        AnyBalance.trace ('Fetching personal data...');

        html = AnyBalance.requestGet ('https://www.sclub.ru/PersonalCabinet/UserForm.aspx');

        AnyBalance.trace ('Parsing personal data...');
    
        // Статус карты
        getParam (html, result, 'cardstate', /Статус карты:[\s\S]*?<span[^>]*>([^<]*)/i);
    }

    AnyBalance.setResult (result);
}
