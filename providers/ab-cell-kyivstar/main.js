/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login,
		'Введите номер вашего телефона для входа в Мой Киевстар (в формате +380ХХХХХХХХХ), например +380971234567');
	checkEmpty(prefs.password, 'Введите пароль!');

	prefs.login = prefs.login.replace(/[^+\d]+/g, ''); //Удаляем всё, кроме + и цифр

//	AnyBalance.setOptions({
//		SSL_ENABLED_PROTOCOLS: ['TLSv1.2'], // https://my.kyivstar.ua очень смущается от присутствия TLSv1.1 и TLSv1.2
//		SSL_ENABLED_CIPHER_SUITES: ['TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384'],
//	});

//	if(prefs.source != 'app'){
		try {
			processSite();
		} catch (e) {
//			if (e.fatal)
				throw e;
//			AnyBalance.trace('Не удалось получить данные из лк: ' + e.message);
//			AnyBalance.trace('Попробуем получить данные из мобильного приложения');
//			processMobileApi();
		}
//	}else{
//		processMobileApi();
//	}
}

var baseurlLogin = "https://b2b.kyivstar.ua/";

function loginSitePhys(){
 	var baseurl = baseurlLogin;
	var html = loginSite(baseurl);

	/**
	if (!/payment\/activity\//i.test(html)) {
		//Не нашли ссылку на платежи. Очень вероятно, что это корпоративный аккаунт
		throw new AnyBalance.Error("Похоже, у вас корпоративный аккаунт. Пожалуйста, воспользуйтесь провайдером Киевстар для корпоративных тарифов");
	}
	*/

	if (/HierarchyOverview/i.test(html)) {
		throw new AnyBalance.Error(
			"Ошибка. Информация о номере не найдена. Если у вас корпоративный аккаунт, воспользуйтесь провайдером Киевстар для корпоративных тарифов."
		);
	}

	return html;
}

function processSite() {
	var prefs = AnyBalance.getPreferences();

	var html = loginSitePhys();

	if(prefs.source == 'auto'){
		if(isLoggedInNew(html) || isNewDemo(html)){
			processNew(html);
		}else{
			processOldNew(html);
		}
	}else if(prefs.source == 'new'){
		processNew(html);
	}else{
		processOldNew(html);
	}
}

function processOldNew(html){
	try{
		processOld(html);
	}catch(e){
		AnyBalance.trace('Ошибка обработки старого кабинета: ' + e.message + '\n' + e.stack);
		processNew();
	}
}

var baseurlNewCabinet = 'https://new.kyivstar.ua/ecare/';

function processNew(html){
	try{
		processNewInner(html);
	}catch(e){
		if(e._relogin){
			AnyBalance.trace('Ошибка: ' + e.message + '\nПробуем перелогиниться');
			AnyBalance.requestGet(baseurlNewCabinet + 'logout', {Referer: baseurlNewCabinet});

			var html = loginSitePhys();
			processNewInner(html);
		}else{
			throw e;
		}
	}
}

function processNewInner(html){
	var baseurl = baseurlNewCabinet;
	AnyBalance.trace('Используем новый кабинет');

	html = goToNewSite(html);
	var prefs = AnyBalance.getPreferences();

	var result = {success: true};

	var pageData = getJsonObject(html, /var\s+pageData\s*=\s*/);
	var phone = jspath1(pageData, "$.pageData.currentSubscription.subscriptionIdentifier");
	if(!endsWith(prefs.login, phone) && !endsWith(phone, prefs.login)){
		AnyBalance.trace('Залогинены не на тот номер, нужен ' + prefs.login + ', попали на ' + phone + '. Попробуем переключиться');

		var availableSubscriptions = jspath1(pageData, "$.slots.SubscriptionSelector[?(@.template='subscriptionSelectorComponent')].data.availableSubscriptions");
		if(!availableSubscriptions)
			throw new AnyBalance.Error('Вошли в кабинет на номер ' + phone + ' и не удалось переключиться на номер ' + prefs.login, {_relogin: true});
		var subscription = availableSubscriptions.filter(function(s) { return endsWith(prefs.login, s.subscriptionIdentifier) || endsWith(s.subscriptionIdentifier, prefs.login)})[0];
		if(!subscription){
			AnyBalance.trace('В кабинете не нашлось номера ' + prefs.login + ' среди ' + availableSubscriptions.map(function(s) { return s.subscriptionIdentifier }).join(', '));
			throw new AnyBalance.Error('В числе прикрепленных номеров в кабинете ' + phone + ' отсутствует ' + prefs.login, {_relogin: true}); 
		}

		html = AnyBalance.requestPost(baseurl + 'changeSelectedSubscription', {
			subscriptionId: subscription.subscriptionIdentifier,
			targetUrl: '/',
			CSRFToken: jspath1(pageData, "$.slots.SubscriptionSelector[?(@.template='subscriptionSelectorComponent')].data.subscriptionForm.inputs.CSRFToken.value")
		}, addHeaders({Referer: baseurl}));

		if(AnyBalance.getLastStatusCode() >= 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось переключиться на нужный номер', {_relogin: true});
		}

		html = goToNewSite(html);
		pageData = getJsonObject(html, /var\s+pageData\s*=\s*/);
	}

	getParam(jspath1(pageData, "$.pageData.currentSubscription.subscriptionIdentifier"), result, 'phone');

	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.accountData.balance"), result, 'balance', null, null, parseBalance);
	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.currencyName"), result, ['currency', 'balance']);
	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.accountData.accountNumber"), result, 'personal_account');

	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='planPanelComponent')].data.servicePlan"), result, '__tariff');
	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='planPanelComponent')].data.subscriptionStatus"), result, 'status');
	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='planPanelComponent')].data.validityPeriod"), result, 'till', null, null, parseDate);

	getParam(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.currentSubscription.bonusBalance"), result, 'bonusValue', null, null, parseBalance);

	var bonuses = jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.bonusBalance.bonusBalances");
	processBonusesNew(bonuses, result);

	var rows = jspath1(pageData, "$.slots.MiddleContent[?(@.template='dailyStatusComponent')].data.dailyStatusRows");
	if(!rows)
		rows = jspath1(pageData, "$.slots.TopContent-Right[?(@.template='dailyStatusComponent')].data.dailyStatusRows");
	processRemaindersNew(rows, result);


	if(AnyBalance.isAvailable('name') || (AnyBalance.isAvailable('phone') && !isset(result.phone))){
		html = AnyBalance.requestGet(baseurl + 'profileSettings', g_headers);
		pageData = getJsonObject(html, /var\s+pageData\s*=\s*/);
	
	    var joinspace = create_aggregate_join(' ');

		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.firstName.value"), result, 'name', null, null, null, joinspace);
		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.middleName.value"), result, 'name', null, null, null, joinspace);
		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.lastName.value"), result, 'name', null, null, null, joinspace);

		if(AnyBalance.isAvailable('phone') && !isset(result.phone))
			sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.contactPhone.value"), result, 'phone');
	}

	AnyBalance.setResult(result);
}

function getBonusFromArray(arr, result, name, re, replaces, parseFunc){
	for(var i=0; i<arr.length; ++i){
		var units = arr[i].unit || '';
		if(!units.trim() && /internet|traffic/i.test(name))
			units = 'мб';
		sumParam(arr[i].value + units, result, name, re, replaces, parseFunc, aggregate_sum);
	}
}

function checkName(type, name){
	switch(type){
	case 'fix-min':
		return /на городские|на стационар|на стаціонар|на міські|fix phone|fix minutes/i.test(name)
	case 'off-net':
		return /другие сети.+(?:фикс|городск)|Other network.+fix|інші мережі.+міськ|Хвилини по Україні|Минуты по Украине/i.test(name)
	case 'off-net-mobile':
		return /Other mobile|off-net.+mobile|минут.+на другие сети|minut.+other.+networks|хвилин.+інші мережі|на інші мобільні|на другие мобильные/i.test(name)
			|| /минут.+на другие мобильные|minut.+other.+networks|хвилин.+інші мобільні/i.test(name)
	case 'internet':
		return /Остаток МБ|Balance MB|Залишок МБ/i.test(name) 
			|| /Интернет|Internet|Інтернет/i.test(name)
	case 'sms':
		return /сообщен|SMS|СМС|повідомлен/i.test(name)
	case 'mms':
		return /MMS|ММС/i.test(name)
	default:
		throw new AnyBalance.Error('Unknown check type!');
	}
}

function processBonusesNew(bonuses, result){
	if(!bonuses){
		AnyBalance.trace('Бонусов нет');
		return;
	}

	for(var i=0; i<bonuses.length; ++i){
		var bonus = bonuses[i];
		AnyBalance.trace('Найден бонус ' + JSON.stringify(bonus));
		if(/домашний интернет|Home Internet|Домашній Інтернет/i.test(bonus.name)){
			AnyBalance.trace('Это домашний интернет');
			getParam(bonus.balanceAmount[0].value, result, 'home_internet', null, null, parseBalance);
			getParam(bonus.bonusExpirationDate, result, 'home_internet_date', null, null, parseDate);
		}else if(checkName('internet', bonus.name)){
			AnyBalance.trace('Это бонусный интернет');
			getBonusFromArray(bonus.balanceAmount, result, 'bonus_internet', null, null, parseTraffic);
			getParam(bonus.bonusExpirationDate, result, 'bonus_internet_date', null, null, parseDate);
		}else if(checkName('off-net', bonus.name)){
			AnyBalance.trace('Это бонусные минуты по Украине');
			getBonusFromArray(bonus.balanceAmount, result, 'bonus_mins_2', null, null, parseMinutes);
			getParam(bonus.bonusExpirationDate, result, 'bonus_mins_2_till', null, null, parseDate);
		}else if(checkName('off-net-mobile', bonus.name)){
			AnyBalance.trace('Это бонусные минуты на другие сети');
			getBonusFromArray(bonus.balanceAmount, result, 'bonus_mins_other_mobile', null, null, parseMinutes);
			getParam(bonus.bonusExpirationDate, result, 'bonus_mins_other_mobile_till', null, null, parseDate);
		}else if(checkName('fix-min', bonus.name)){
			AnyBalance.trace('Это минуты на фикс. номера');
			getBonusFromArray(bonus.balanceAmount, result, 'mins_fix', null, null, parseMinutes);
			getParam(bonus.bonusExpirationDate, result, 'mins_fix_till', null, null, parseDate);
		}else if(checkName('sms', bonus.name)){
			AnyBalance.trace('Это SMS');
			getBonusFromArray(bonus.balanceAmount, result, 'sms', null, null, parseBalance);
		}else if(checkName('mms', bonus.name)){
			AnyBalance.trace('Это MMS');
			getBonusFromArray(bonus.balanceAmount, result, 'sms', null, null, parseBalance);
		}else if(/Экстра Деньги|Extra money|Екстра гроші/i.test(bonus.name)){
			AnyBalance.trace('Это бонусные деньги');
			getParam(bonus.balanceAmount[0].value, result, 'bonus_money', null, null, parseBalance);
			getParam(bonus.bonusExpirationDate, result, 'bonus_money_date', null, null, parseDate);
		}else{
			AnyBalance.trace('!!! Неизвестный бонус...');
		}
	}

}

function processRemaindersNew(bonuses, result){
	if(!bonuses){
		AnyBalance.trace('Остатков нет');
		return;
	}

	function getBonusLocal(avlbl, check, dn, counter, func){
		if(checkName(check, avlbl.categoryName) || checkName(check, bonus.usageTypeName)){
			if(AnyBalance.isAvailable(counter) && !isset(result[counter])){
				AnyBalance.trace(dn + ', но не учлись в бонусах! Учитываем.');
				func();
			}else{
				AnyBalance.trace(dn + ', должны были учесться в бонусах!');
			}
			return true;
		}
		return false;
	}

	for(var i=0; i<bonuses.length; ++i){
		var bonus = bonuses[i];
		AnyBalance.trace('Найден остаток ' + JSON.stringify(bonus));
		if(!bonus.availableAmountDetails || !bonus.availableAmountDetails.length){
			AnyBalance.trace('Не содержит текущего остатка, пропускаем...');
			continue;
		}
		var avlbl = bonus.availableAmountDetails[0];

		getBonusLocal(avlbl, 'off-net', 'минуты по Украине', 'bonus_mins_2', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'bonus_mins_2', null, null, parseMinutes);
			getParam(avlbl.balanceAmount[0].period, result, 'bonus_mins_2_till', null, null, parseDate);
		}) ||
		getBonusLocal(avlbl, 'off-net-mobile', 'минуты на другие сети', 'bonus_mins_other_mobile', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'bonus_mins_other_mobile', null, null, parseMinutes);
			getParam(avlbl.balanceAmount[0].period, result, 'bonus_mins_other_mobile_till', null, null, parseDate);
		}) ||
		getBonusLocal(avlbl, 'fix-min', 'минуты на фикс. номера', 'mins_fix', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'mins_fix', null, null, parseMinutes);
			getParam(avlbl.balanceAmount[0].period, result, 'mins_fix_till', null, null, parseDate);
		}) ||
		getBonusLocal(avlbl, 'sms', 'SMS', 'sms', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'sms', null, null, parseBalance);
		}) ||
		getBonusLocal(avlbl, 'mms', 'MMS', 'mms', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'mms', null, null, parseBalance);
		}) ||
		getBonusLocal(avlbl, 'internet', 'Интернет', 'bonus_internet', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'bonus_internet', null, null, parseTraffic);
		}) ||
		
		AnyBalance.trace('!!! Неизвестный остаток...');
	}

}

function processOld(html){
	var prefs = AnyBalance.getPreferences();
 	var baseurl = "https://my.kyivstar.ua/";
 	AnyBalance.trace('Используем старый кабинет');

 	html = goToOldSite(html);

	var result = {
			success: true
		},
		current_balance = '',
		current_currency = '';

	//тип ЛК
	if (/(?:мобильного|мобільного|Mobile\s+phone\s+number)/i.test(html)) {
		AnyBalance.trace('тип лк: Домашний интернет');

		// Баланс
		current_balance = getParam(html, null, null,
			/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces,
			parseBalance);
		current_currency = getParam(html, null, null,
			/(?:Текущий\s+баланс|Поточний\s+баланс|Current\s+balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseCurrency);

		// Бонус
		getParam(html, result, 'bonusValue',
			/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseBalance);

		getParam(html, result, 'bonusDate',
			/(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

		//Номер телефона
		getParam(html, result, 'phone',
			/(?:Номер\s+мобильного\s+телефона|Номер\s+мобільного\s+телефону|Mobile\s+phone\s+number)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

		//Статус
		getParam(html, result, 'status',
			/(?:Статус\s+услуги|Статус\s+послуги|state\s+of\s+service)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

		//Лицевой счет
		getParam(html, result, 'personal_account',
			/(?:Лицевой\s+сч[её]т|Особовий\s+рахунок|Account:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces);

	} else {
		AnyBalance.trace('тип лк: Телефон');
		
		if (html.indexOf(prefs.login.substr(-10)) < 0) {
			var num = getParam(html, /Номер:[\s\S]*?<td[^>]*>([^<]*)/i,	replaceTagsAndSpaces);
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти на нужный номер! Нужно ' + prefs.login + ', а зашли на ' + num + '. Попробуйте обновить аккаунт через вайфай.');
		}

		//Срок действия номера
		sumParam(html, result, 'till', /(?:Номер діє до:|Номер действует до:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseDate, aggregate_sum);

		// Баланс (лк Телефон)
		current_balance = getParam(html, null, null,
			/(?:Остаток\s+на\s+сч[её]ту|Залишок\s+на\s+рахунку:)[\s\S]*?<tr[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces,
			parseBalance);
		current_currency = getParam(html, null, null,
			/(?:Остаток\s+на\s+сч[её]ту|Залишок\s+на\s+рахунку:)[\s\S]*?<tr[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseCurrency);

		//Номер телефона (лк Телефон)
		getParam(html, result, 'phone',
			/Номер:[\s\S]*?<td[^>]*>([^<]*)/i,
			replaceTagsAndSpaces);


		getYetAnotherInfo(html, baseurl, result); //Начисление абонентской платы по услуге "-33%" 3.02.2016

	}

	//все основные бонусы в виде текста
//	getFullBonusText(html, result);

	if (!current_balance) {
		current_balance = getParam(html, null, null,
			/(?:Поточний\s+баланс|Текущий\s+баланс):[\s\S]*?<\/td>([\s\S]*?)<a/i, replaceTagsAndSpaces, parseBalance);

		current_currency = getParam(html, null, null,
			/(?:Поточний\s+баланс|Текущий\s+баланс):[\s\S]*?<\/td>([\s\S]*?)<a/i, replaceTagsAndSpaces, parseCurrency);
	}


	getParam(current_balance, result, 'balance');
	getParam(current_currency, result, 'currency');

	getParam(html, result, 'name',
		/(?:Фамилия|Прізвище|First\s+name)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	//Тарифный план
	getParam(html, result, '__tariff',
		/(?:Тарифный\s+план|Тарифний\s+план|Rate\s+Plan)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		[/<span[^>]+hidden[^>]*>[\s\S]*?<\/span>/i, '', replaceTagsAndSpaces]);

	//Дата подключения
	getParam(html, result, 'connection_date',
		/(?:Дата\s+подключения|Дата\s+підключення|Connection\s+date)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate);



	//Бонусные минуты (1) на номера внутри сети
	sumParam(html, result, 'bonus_mins_1',
		/(?:Кількість хвилин для дзвінків|Количество минут для звонков)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Хвилини всередині мережі ["«»]?Ки.встар["«»]?:|Минуты внутри сети ["«»]?Ки.встар["«»]?:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Єдина абонентська група:|Единая абонентская группа:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Залишок хвилин для дзвінків на Ки.встар:|Остаток минут для звонков на Ки.встар:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Залишок хвилин для дзвінків абонентам Ки.встар та Beeline|Остаток минут для звонков абонентам Ки.встар и Beeline)\s*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_1',
		/(?:Залишок:|Остаток минут на сеть Киевстар:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		parseMinutes, aggregate_sum); //обратить внимание на "Залишок:", может измениться
	//Срок действия бонусных минут (1)
	sumParam(html, result, 'bonus_mins_1_till',
		/(?:Залишок хвилин для дзвінків на Ки.встар:|Остаток минут для звонков на Ки.встар:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_min);

	//Бонусные минуты (2) на любые номера
	sumParam(html, result, 'bonus_mins_2',
		/(?:хвилин на міські номери"?:|минут на городские номера"?:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок Хвилини на КС 500 хв:|Остаток Минуты на КС 500 мин:)[\s\S]*?<b>([^<]*)/ig, replaceTagsAndSpaces,
		parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок тарифних хвилин для дзвінків в межах України:|Остаток тарифних минут для звонков в пределах Украин[иы]\s*:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок хвилин для дзвінків в межах України:|Остаток минут для звонков в пределах Украин[иы]\s*:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_2',
		/(?:Залишок хвилин для дзвінків по Україні:|Остаток минут для звонков по Украине:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);

	//Срок действия бонусных минут (2)
	sumParam(html, result, 'bonus_mins_2_till',
		/(?:хвилин на міські номери"?:|минут на городские номера"?:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_min);

	//Минуты на другие сети
	sumParam(html, result, 'bonus_mins_other_mobile',
		/(?:Залишок хвилин для дзвінків на інших операторів|Остаток минут для звонков на других операторов)(?:[^>]*>){3}(.*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_other_mobile',
		/(?:Залишок хвилин для дзвінків абонентам Ки.встар та DJUICE:|Остаток минут для звонков абонентам Ки.встар и DJUICE:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_other_mobile', /(?:Залишок хвилин|Остаток минут):(?:[^>]*>){3}(.*)/ig, replaceTagsAndSpaces,
		parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_other_mobile',
		/(?:Залишок хвилин на інші мобільні мережі в межах України|Остаток минут на другие мобильные сети в пределах Украины):(?:[^>]*>){3}(.*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_other_mobile',
		/(?:Залишок хвилин на інші мережі по Україні:|Остаток минут на другие сети по Украине:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_other_mobile',
		/(?:Залишок хвилин для дзвінків на інші мережі|Остаток минут для звонков на другие сети)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'bonus_mins_other_mobile', /(?:Хвилини на інші мобільні|Минуты на другие мобильные):(?:[^>]*>){3}(.*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	//Срок действия минут на другие сети
	sumParam(html, result, 'bonus_mins_other_mobile_till',
		/(?:Залишок хвилин на інші мобільні мережі в межах України:|Остаток минут на другие мобильные сети в пределах Украины:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_mins_other_mobile_till',
		/(?:Залишок хвилин на інші мережі по Україні:|Остаток минут на другие сети по Украине:)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_mins_other_mobile_till',
		/(?:Залишок хвилин для дзвінків на інші мережі|Остаток минут для звонков на другие сети)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_mins_other_mobile_till',
		/(?:Хвилини на інші мобільні|Минуты на другие мобильные)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/td>/i,
		replaceTagsAndSpaces, parseDate, aggregate_min);

	//Тарифные минуты:
	sumParam(html, result, 'mins_tariff', /(?:Тарифні хвилини:|Тарифные минуты:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	//Доплата за входящие:
	sumParam(html, result, 'inc_pay', /(?:Доплата за входящие звонки:|Доплата за входящие звонки:)[\s\S]*?<b>([^<]*)/ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//MMS
	sumParam(html, result, 'mms', />(?:MMS для отправки по Украине:|MMS для відправки по Україні:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance,
		aggregate_sum);
	sumParam(html, result, 'mms', />(?:Бонусні MMS:|Бонусные MMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance,
		aggregate_sum);
	sumParam(html, result, 'mms', />MMS:[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//SMS
	sumParam(html, result, 'sms', />(?:Бонусні SMS:|Бонусные SMS:)[\s\S]*?<b>(.*?)</, replaceTagsAndSpaces, parseBalance,
		aggregate_sum);
	sumParam(html, result, 'sms', />SMS:[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms',
		/(?:Остаток текстових сообщений для отправки абонентам Киевстар и Beeline|Залишок текстових повідомлень для відправки абонентам Київстар та Beeline):[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:СМС за умовами (?:ТП|пакета):|СМС по условиям (?:ТП|пакета):)[\s\S]*?<b>(.*?)</,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Залишок смс|Остаток смс):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance,
		aggregate_sum);
	sumParam(html, result, 'sms',
		/>(?:Домашній регіон. Залишок СМС по Україні|Домашний регион. Остаток СМС по Украине):[\s\S]*?<b>(.*?)</i,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:SMS по Україні|SMS[^<]*по Украине:)[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Остаток сообщений|Остаток сообщений):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Залишок SMS на день|Остаток SMS на день):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'sms', />(?:Залишок SMS|Остаток SMS):[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance,
		aggregate_sum);

	//Бонусные средства
	sumParam(html, result, 'bonus_money', /(?:Бонусні кошти:|Бонусные средства:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money',
		/(?:Бонуси за умовами тарифного плану ["«»]Єдина ціна["«»]:|Бонусы по условиям тарифного плана ["«»]Единая цена["«»]:)[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money',
		/(?:["«»]Екстра кошти["«»]|["«»]Экстра деньги["«»]|["«»]Екстра гроші["«»]):[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money_till',
		/(?:Бонусні кошти:|Бонусные средства:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate,
		aggregate_min);
	sumParam(html, result, 'bonus_money_till',
		/(?:Бонуси за умовами тарифного плану ["«»]Єдина ціна["«»]:|Бонусы по условиям тарифного плана ["«»]Единая цена["«»]:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_money_till',
		/(?:Кошти по послузі ["«»]Екстра кошти["«»]|Средства по услуге ["«»]Экстра деньги["«»]):(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	//Остаток бонусов
	sumParam(html, result, 'bonus_left', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_left',
		/(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_left', /(?:Акція «Бонус \+»:|Акция «Бонус \+»:)[\s\S]*?<b>(.*?)</ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'bonus_money_till',
		/(?:Залишок бонусів:|Остаток бонусов:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate,
		aggregate_min);
	sumParam(html, result, 'bonus_money_till',
		/(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?(?:Залишок бонусів:|Остаток бонусов:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	sumParam(html, result, 'bonus_money_till',
		/(?:Акція «Бонус \+»:|Акция «Бонус \+»:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate,
		aggregate_min);
	//Интернет
	sumParam(html, result, 'internet',
		/(?:Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Залишок байт для користування послугою Інтернет GPRS\s*:|Остаток байт для пользования услугой Интернет GPRS\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Остаток GPRS Internet\s*:|Залишок GPRS Internet\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Остаток Мб для пользования услугой Интернет GPRS\s*:|Залишок Мб для користування послугою Інтернет GPRS\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Мб для Мобильного Интернета|Мб для Мобільного Інтернету)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet',
		/(?:Залишок байт на день:|Остаток байт на день:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		function(str) {
			return parseTraffic(str, 'b');
		}, aggregate_sum);
	sumParam(html, result, 'internet', /(?:Інтернет:|Интернет:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces,
		function(str) {
			return parseTraffic(str, 'b');
		}, aggregate_sum);
	//  (?:Internet_\d+Mb_в_день:) - А вот так пейстор чудит...
	sumParam(html, result, 'internet', /Internet_\d{1,4}Mb_в_день:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces,
		function(str) {
			return parseTraffic(str, 'b');
		}, aggregate_sum);
	//Бонусный интернет
	sumParam(html, result, 'internet',
		/(?:Остаток МБ\s*:|Залишок МБ\s*:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);

	sumParam(html, result, 'bonus_internet',
		/(?:Залишок бонусного об’єму даних для інтернет доступу:|Остаток бонусного объема данных для интернет доступа:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'bonus_internet_till',
		/(?:Залишок бонусного об’єму даних для інтернет доступу:|Остаток бонусного объема данных для интернет доступа:)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig,
		replaceTagsAndSpaces, parseDate, aggregate_min);
	//Домашний Интернет
	sumParam(html, result, 'home_internet',
		/(?:Від послуги[^<]*Домашній Інтернет|От услуги[^<]*Домашний Интернет|Бонусні кошти послуги[^<]*Домашній Інтернет|Бонусные средства услуги[^<]*Домашний Интернет|Від Домашнього Інтернету|От Домашнего Интернета)[^<]*:(?:[^>]*>){3}([\s\S]*?)грн/ig,
		replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(html, result, 'home_internet_date',
		/(?:Від послуги[^<]*Домашній Інтернет|От услуги[^<]*Домашний Интернет|Бонусні кошти послуги[^<]*Домашній Інтернет|Бонусные средства услуги[^<]*Домашний Интернет|Від Домашнього Інтернету|От Домашнего Интернета)[^<]*:(?:[^>]*>){8}\s*<nobr>([^<]*)/i,
		replaceTagsAndSpaces, parseDate);
	//Порог отключения
	sumParam(html, result, 'limit', /(?:Поріг відключення:|Порог отключения:)[\s\S]*?<b>([^<]*)/i, replaceTagsAndSpaces,
		parseBalance, aggregate_sum);



	//Срок действия услуги Комфортный переход
	if (AnyBalance.isAvailable('comfort_till')) {
		if (!/overview/i.test(AnyBalance.getLastUrl()))
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/overview.do", g_headers);
		if (/show.do\?featureId=99&amp;in=1/i.test(html)) {
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/complexFeature/show.do?featureId=99&in=1", g_headers);
			sumParam(html, result, 'comfort_till',
				/(?:Послуга буде автоматично відключена&nbsp;|Услуга будет автоматически отключена&nbsp;)([\s\S]*?)<\/td>/ig,
				replaceTagsAndSpaces, parseDate, aggregate_min);
		}
	}
	//Пакет SMS
	if (AnyBalance.isAvailable('sms_packet', 'sms_packet_till', 'sms_packet_left')) {
		if (!/overview/i.test(AnyBalance.getLastUrl()))
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/overview.do", g_headers);
		if (/show.do\?featureId=349&amp;in=1/i.test(html)) {
			html = AnyBalance.requestGet(baseurl + "tbmb/tsm/complexFeature/show.do?featureId=349&in=1", g_headers);
			getParam(html, result, 'sms_packet', /<nobr>(?:Пакет: |Пакет: )<strong> ([\s\S]*?) <\/strong>/i,
				replaceTagsAndSpaces);
			sumParam(html, result, 'sms_packet_till', /<nobr>(?:Срок действия:|Строк дії:) <strong> ([\s\S]*?)<\/strong>/ig,
				replaceTagsAndSpaces, parseDate, aggregate_min);
			sumParam(html, result, 'sms_packet_left', /<nobr>(?:Остаток:|Залишок:) <strong> ([\s\S]*?)sms/ig,
				replaceTagsAndSpaces, parseInt, aggregate_sum);
		}
	}
	AnyBalance.setResult(result);
}

var g_session_counter = 0;
var g_session_token;
var g_replace_date = [/01.01.0001/, 'истек'];

function createMobileParams(params) {
	var o = {
		"version": "1.6.0.0",
		"lang": "ru",
		"sourceId": "Android 4.2"
	};
	var ret = {};
	if (params) {
		for (var i in params) {
			ret[i] = params[i];
		}
	}
	for (var i in o) {
		ret[i] = o[i];
	}
	return ret;
}

function getMobileApiResult(json) {
	if (json.errorCode)
		throw new AnyBalance.Error(json.errorMsg, null, /wrong\s+password/i.test(json.errorMsg));
	return json.value;
}

function callMobileApi(cmd, params) {
	var html, baseurl = 'https://b2b.kyivstar.ua/MobileConverter2/v2/';
	var headers = {
		Connection: 'keep-alive',
		SESSION_COUNTER: '' + (g_session_counter++),
		SESSION_TOKEN: g_session_token,
		'Content-Type': 'application/json;charset=UTF-8',
		'X-Requested-With': 'com.kyivstar.mykyivstar',
		'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.2; ru-ru; Android SDK built for x86 Build/JOP40C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
		'Accept-Language': 'ru-RU, en-US',
		'Accept-Charset': 'utf-8, iso-8859-1, utf-16, *;q=0.7'
	};

	if (!isArray(params)) { //Простой запрос
		html = AnyBalance.requestPost(baseurl + cmd + '/?' + new Date().getTime(), JSON.stringify({
			param: createMobileParams(params)
		}), headers);
		var json = getJson(html);
		var value = getMobileApiResult(json);
		if (cmd == 'login2') {
			if (value.session_token)
				g_session_token = value.session_token;
		}
		return value;
	} else { //Бэтч
		var batchParams = [];
		for (var i = 0; i < params.length; ++i) {
			var param = params[i];
			for (var name in param) {
				var newParam = {};
				newParam[name] = {
					param: createMobileParams([param[name]])
				};
				batchParams.push(newParam);
			}
		}
		html = AnyBalance.requestPost(baseurl + 'batch/?' + new Date().getTime(), JSON.stringify(batchParams), headers);
		var json = getJson(html);
		return json;
	}
}

function processMobileApi() {
	var prefs = AnyBalance.getPreferences();
	var result = {
		success: true
	};

	AnyBalance.trace('Получаем данные из мобильного приложения');

	loginMobile();

	var ticket = getParam(AnyBalance.getLastUrl(), null, null, /ticket=([^&]*)/i, null, decodeURIComponent);
	if (!ticket)
		throw new AnyBalance.Error('Не удалось найти тикет для авторизации в мобильном приложении. Сайт изменен?');

	var json = callMobileApi('login2', {
		ticket: ticket
	});

	//Важно, что на этапе расчета бонусов именно этот тарифный план (код его)
	getParam(json.rate_plan, result, '__tariff');
	getParam(json.uid, result, 'phone');

	json = callMobileApi('batch', [{
		getBalance: {}
	}, {
		getBonuses: {}
	}, {
		showProfile: {}
	}]);

	for (var i = 0; i < json.length; ++i) {
		for (var func in json[i]) {
			var ret = getMobileApiResult(json[i][func]);
			switch (func) {
				case 'getBalance':
					getParam(ret.balance, result, 'balance', null, null, parseBalance);
					getParam(ret.exp_date, result, 'till', null, g_replace_date, parseDate);
					break;
				case 'getBonuses':
					processBonuses(ret, result);
					break;
				case 'showProfile':
					if (ret.account)
						getParam(ret.account, result, 'personal_account');
					if (ret.ratePlan)
						getParam(ret.ratePlan.uk_ua || ret.ratePlan.ru_ru || ret.ratePlan.en_us, result, '__tariff');
					break;
			}
		}
	}

	setCountersToNull(result);
	AnyBalance.setResult(result);
}

function processBonuses(bonuses, result) {
	for (var name in bonuses) {
		if (isArray(bonuses[name])) {
			for (var i = 0; i < bonuses[name].length; ++i) {
				processBonus(bonuses[name][i], name, result);
			}
		} else {
			processBonus(bonuses[name], name, result);
		}
	}
}

function getDateValue(bonus){
	if(/\d\d\D\d\d\D\d{4}/.test(bonus[2]))
		return bonus[2];
}

function getUnitsValue(bonus){
	if(/\d\d\D\d\d\D\d{4}/.test(bonus[2]))
		return bonus[3];
	return bonus[2];
}

function processBonus(bonus, name, result) {
	if (isArray(bonus)) {
		if (/TIME/i.test(name) && /3G_TALK/i.test(result.__tariff)){
			//Для некоторых тарифных планов (надеюсь, что не для отдельных номеров), в апи вместо минут секунды.
			AnyBalance.trace('Для тарифного плана ' + result.__tariff + ' ' + bonus[3] + ' заменяются на СЕК.');
			bonus[3] = 'СЕК.';
		}
		if (/От Домашнего Интернета/i.test(bonus[0])) {
			getParam(bonus[1], result, 'home_internet', null, null, parseBalance);
			getParam(getDateValue(bonus), result, 'home_internet_till', null, g_replace_date, parseDate);
		} else if (/Экстра деньги|Бонусные средства/i.test(bonus[0])) {
			sumParam(bonus[1], result, 'bonus_money', null, null, parseBalance, aggregate_sum);
			sumParam(getDateValue(bonus), result, 'bonus_money_till', null, g_replace_date, parseDate, aggregate_min);
		} else if (/Остаток бонусов/i.test(bonus[0])) {
			getParam(bonus[1], result, 'bonus_left', null, null, parseBalance);
		} else if (/SMS|смс|Остаток сообщений/i.test(bonus[0])) {
			sumParam(bonus[1], result, 'sms', null, null, parseBalance, aggregate_sum);
		} else if (/MMS|ммс/i.test(bonus[0])) {
			sumParam(bonus[1], result, 'mms', null, null, parseBalance, aggregate_sum);
		} else if (/sms/i.test(name)) {
			AnyBalance.trace('Неизвестные sms ' + name + ', относим к sms: ' + JSON.stringify(bonus));
			sumParam(bonus[1], result, 'sms', null, null, parseBalance, aggregate_sum);
		} else if (/TIME/i.test(name) && /на Киевстар|В сети Киевстар/i.test(bonus[0])) {
			sumParam(bonus[1] + bonus[3], result, 'bonus_mins_1', null, null, parseMinutes, aggregate_sum);
			sumParam(getDateValue(bonus), result, 'bonus_mins_1_till', null, g_replace_date, parseDate, aggregate_min);
		} else if (/TIME/i.test(name) && /на другие мобильные/i.test(bonus[0])) {
			sumParam(bonus[1] + bonus[3], result, 'bonus_mins_other_mobile', null, null, parseMinutes, aggregate_sum);
			sumParam(getDateValue(bonus), result, 'bonus_mins_other_mobile_till', null, g_replace_date, parseDate, aggregate_min);
		} else if (/TIME/i.test(name)) {
			if (!/В пределах Укр|по Украине|на другие сети/i.test(bonus[0]))
				AnyBalance.trace('Неизвестные минуты ' + name + ', относим к минутам на все сети: ' + JSON.stringify(bonus));
			sumParam(bonus[1] + bonus[3], result, 'bonus_mins_2', null, null, parseMinutes, aggregate_sum);
			sumParam(getDateValue(bonus), result, 'bonus_mins_2_till', null, g_replace_date, parseDate, aggregate_min);
		} else if (/INET/i.test(name)) {
			sumParam(bonus[1] + getUnitsValue(bonus), result, 'internet', null, null, parseTraffic, aggregate_sum);
		} else {
			AnyBalance.trace('Неизвестный бонус ' + name + ': ' + JSON.stringify(bonus));
		}
	} else {
		AnyBalance.trace('Пропускаем суммарный бонус ' + name + ': ' + bonus);
	}
}


/*
function getFullBonusText(html, result) {
	if (AnyBalance.isAvailable('mainBonusInfoText')) {
		try {
			var
				table = html.match(/<h2[^>]*>\s*(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)\s*<\/h2>[\s\S]*?(<tr[\s\S]*?)<\/table/i)[1],
				tr = AB.sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi),
				td = [],
				mainBonusInfoText = [];

			for (var i = 0; i < tr.length; i++) {
				td = AB.sumParam(tr[i], null, null, /<td[^>]*>([\s\S]*?)<\/td>/gi, replaceTagsAndSpaces);
				mainBonusInfoText.push(
					'Тип бонуса:«' + td[0] + '» Остаток:' + td[1] + ' Срок действия:' + td[2]
				);

			}

			AB.getParam(mainBonusInfoText.join(', '), result, 'mainBonusInfoText');

		} catch (e) {
			AnyBalance.trace('не удалось получить текстовую информацию по бонусам ' + e);
		}
	}
}
*/

function getYetAnotherInfo(html, baseurl, result) {
	if (AnyBalance.isAvailable('other_costs')) {
		// html = AnyBalance.requestGet(baseurl + 'tbmb/b2c/view/wireless_number_summary.do', g_headers);
		html = AnyBalance.requestGet(baseurl + 'tbmb/view/wireless_number_chrgs.do', g_headers);
		getParam(html, result, 'other_costs',
			/Начисление\s+абонентской\s+платы\s+по\s+услуге\s+&#34;-33%&#34;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseBalance);
	}
}
