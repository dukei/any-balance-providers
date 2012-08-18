/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о кредите в банке "Русский стандарт".

Сайт: https://online.rsb.ru/
*/

function main() {

    var result = {
        success: true
    };

    var prefs = AnyBalance.getPreferences();
    
	var html = AnyBalance.requestPost('https://online.rsb.ru/hb/faces/security_check', {
		j_username: prefs.login,
		login: '',
		j_password: prefs.password,
		pass: '',
		systemid: 'hb'
	  });

	var r = new RegExp('<a [^>]+ class="exit" href="#">');
	if(!r.test(html)) throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');

	html = AnyBalance.requestGet('https://online.rsb.ru/hb/faces/rs/credits/RSCredit.jspx');

	var r = new RegExp('<table class="accounts">.+?<p>&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072; - '+prefs.contract+'</p>.+?</table>');
	var matches=r.exec(html);

	if(matches==null) throw new AnyBalance.Error('Кредит с указанным номером договора не найден');
	result.contract=prefs.contract;
	html=matches[0];

	r = new RegExp('<p>&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; - ([0-9.]+)</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.contract_date=matches[1];
	}

	r = new RegExp('<p>Сумма кредита - ([0-9 ,]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.credit_sum=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

	r = new RegExp('<p>Выплачено - ([0-9 ,]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.paided=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

	r = new RegExp('<p>Остаток на счёте - ([0-9 ,]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.account_balance=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

	r = new RegExp('<div class="desc">&#1044;&#1086; &#1089;&#1087;&#1080;&#1089;&#1099;&#1074;&#1072;&#1085;&#1080;&#1103; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072;(?:<span class="warning">) &#1086;&#1089;&#1090;&#1072;&#1083;&#1086;&#1089;&#1100; (\\d+) &#1076;&#1085;');
	matches=r.exec(html);
	if(matches!=null) {
		result.left=parseInt(matches[1]);
	}

	r = new RegExp('<p class="money">([0-9 ,-]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.credit_balance=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

	r = new RegExp('<p class="payment">Следующий платеж ([0-9 ,]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.payment_sum=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

	r = new RegExp('<p class="payment">до ([0-9.]+)<a');
	matches=r.exec(html);
	if(matches!=null) {
		result.writeoff_date=matches[1];
	}
	
    AnyBalance.setResult(result);
}