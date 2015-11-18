/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://bananawars.ru/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	/* Проверка наличия логина и пароля */
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html;
	
	var data = {
			auth_name: prefs.login,
			auth_pass: prefs.password
	};
	
	html = AnyBalance.requestPost(baseurl, data);
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /(Неправильный пароль)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		{
			AnyBalance.requestGet(baseurl + 'xml/main/logout.php?do=logout');
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}
	
	var levelReg = /.+?Уровень:.*?>[^>\d]*?(\d{1,})[^<\d]*?<.+/im;
	var boostersReg = /.+?<a id="bonusLbl".*?>(\d+?)<.+?/im;
	var moneyReg = /<span id="moneyLbl">(-?\d{1,}\.?\d{0,1})<\/span>/i;
	var ratingReg = /<a href='\/items\/\?act=achievements' >(\d+?)<.+/im;
	var placeReg = /<a href='\/xml\/misc\/rating\.php\?act=rating_total#my_rate' >(\d+?)<.+/im;
	var mailReg = /.+?><a href=\/mail\/>.*?(\d+?(<\/font>\/)?\d*?)<\/a>.+/im;
	var pointsReg = /.+?<a href='\/xml\/misc\/rating.php\?act=rating_glory#my_rate'.*?>(\d+?)<.+/im;
	
	var matchLevel = html.match(levelReg);
	var matchBoosters = html.match(boostersReg);
	var matchMoney = html.match(moneyReg);
	var matchPoints = html.match(pointsReg);
	var matchRating = html.match(ratingReg);
	
	var matchPlace = html.match(placeReg);
	
	var matchMail = html.match(mailReg);
	
	var level, boosters, money, rating, place, points, mail;
	
	if(false
		|| matchLevel == null
		|| matchBoosters == null
		|| matchMoney == null
		|| matchPoints == null
		|| matchMail == null
	) {
		 AnyBalance.Error('Не удалось прочитать значения. Сайт изменен?');
	} else if(false
		|| isNaN(matchLevel[1])
		|| isNaN(matchBoosters[1])
		|| isNaN(matchMoney[1])
		|| isNaN(matchPoints[1])
		|| !/\d+?(<\/font>\/)?\d*?/.test(matchMail[1])
	) {
		AnyBalance.Error('Не удалось прочитать значения. Сайт изменен?');
	} else {
		level = Number(matchLevel[1]);
		boosters = Number(matchBoosters[1]);
		money = Number(matchMoney[1]);
		if(matchPlace != null && matchRating != null) {
			rating = Number(matchRating[1]);
			place = Number(matchPlace[1]);
		}
		points = Number(matchPoints[1]);
		mail = matchMail[1].replace('</font>', '');
	}
	
	var result = {
		success: true,
		level: level,
		boosters: boosters,
		money: money,
		points: points,
		mail: mail
	};
	
	if(matchPlace != null && matchRating != null) {
		result.rating = rating;
		result.place = place;
	}
	
	AnyBalance.requestGet(baseurl + 'xml/main/logout.php?do=logout');
	
	AnyBalance.setResult(result);
}