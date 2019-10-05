function main(){
	AnyBalance.trace('main started', null);
	var n = '9643 10020 33118 64240';
	var data ={cardnumber: n};
	var info = AnyBalance.requestPost('https://pay.brsc.ru/Alga.pay/GoldenCrownSite.php', data);
	var balance = -1;
	if (matches = info.match(/<p>(.*?)руб.<\/p>/)){
		AnyBalance.trace('found balance');
		AnyBalance.trace(matches[1]);
		balance = Number(matches[1]);
	}else{
		AnyBalance.trace('nothing found');
		AnyBalance.trace(matches);
	}
	AnyBalance.trace(info, null);
	AnyBalance.setResult({success: true, balance: balance});
}