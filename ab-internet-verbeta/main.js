/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер Verbeta Telecom
Сайт оператора: http://verbeta.ru
Личный кабинет: https://billing.verbeta.ru
1.0.1 - Начало начал.
*/

function main(){
	AnyBalance.trace('Connecting...');

	var post = AnyBalance.getPreferences();
	var url='https://billing.verbeta.ru/client/index.php';

	AnyBalance.trace('Sending a request for authorization');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestPost(url, post);
	if (!/Общая информация/.exec(html)){
		AnyBalance.trace('Что-то не то, возможно проблемы с сайтом');
		throw new AnyBalance.Error ('Authorization error.');
	};
	var result = {success: true};

	AnyBalance.trace ('Start parsing...');


    regexp=/ть тариф.*>(.*)<\/a/;
    res=regexp.exec(html)
    result.__tariff=res[1];
	AnyBalance.trace ('Тариф - ок');


	if(AnyBalance.isAvailable('dogovor')){

    regexp=/showHistoryRent.*,.\'(.*)\'/;
		if (res=regexp.exec(html)){
			result.dogovor=res[1];
			AnyBalance.trace ('Номер договора - ок');
		}
	}

	if(AnyBalance.isAvailable('balance')){
    regexp=/style=\"color: red\">(.*)</;
		if (res=regexp.exec(html)){
			result.balance=res[1].replace(/\s+/g, '').replace(",",".");;
			AnyBalance.trace ('Баланс счета - ок');
		}
	}

	if(AnyBalance.isAvailable('status')){
    regexp=/vgroupStatus.*>(.*)<.a/;
		if (res=regexp.exec(html)){
			result.status=res[1];
			AnyBalance.trace ('Статус счета - ок');
		}
	}


	if(AnyBalance.isAvailable('dolg')){
	post = {"devision":1}
	var html = AnyBalance.requestPost(url, post);
    regexp=/сть до:<.*\n.* red.>(.*)</;
		if (res=regexp.exec(html)){result.dolg=res[1]}
	}

	AnyBalance.trace ('End parsing...');	
	AnyBalance.setResult(result);

}