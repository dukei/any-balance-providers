/**
Процедура входа в Яндекс. Унифицирована и выделена в отдельный файл для удобства встраивания
*/

function loginYandex(login, password, html, retpath, origin) {
	var baseurl = "https://passport.yandex.ru";
	
	const params = {};
	if (origin) 
		params.origin = origin;
	if (retpath) 
		params.retpath = retpath;
	let referer = baseurl + '/auth/?' + createUrlEncodedParams(params);
	if (!html)
		html = AnyBalance.requestGet(referer, g_headers);
	
	const csrf = getParam(html, /<input[^>]+name="csrf_token"[^>]*value="([^"]*)/i, replaceHtmlEntities);
	const process_uuid = getParam(html, /process_uuid=([^&"]*)/i, replaceHtmlEntities, decodeURIComponent);

	html = AnyBalance.requestPost(baseurl + '/registration-validations/auth/multi_step/start', {
		csrf_token: csrf,
		login: login,
		process_uuid: process_uuid,
		retpath: retpath,
		origin: origin		
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Origin: baseurl,
		Referer: referer
	}));
	let json = getJson(html);
	if(json.status !== 'ok'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Вход не может быть выполнен. Сайт изменен?');
	}
	if(!json.can_authorize){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Этот логин не может быть авторизован');
	}
	const track_id = json.track_id;

	html = AnyBalance.requestPost(baseurl + '/registration-validations/auth/multi_step/commit_password', {
		csrf_token: csrf,
		track_id: track_id,
		password: password,
		retpath: retpath
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Origin: baseurl,
		Referer: referer
	}));
	json = getJson(html);
	if(json.status !== 'ok'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Пароль не принят. Сайт изменен?');
	}

	if(json.state === 'auth_challenge'){
		AnyBalance.trace('Потребовалась дополнительная проверка входа');

		html = AnyBalance.requestPost(baseurl + '/registration-validations/auth/challenge/submit', {
			csrf_token: csrf,
			track_id: track_id,
		}, addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			Origin: baseurl,
			Referer: referer
		}));
		json = getJson(html);
		if(json.status !== 'ok'){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Пароль не принят. Сайт изменен?');
		}
		const challengeType = json.challenge.challengeType;

		if(challengeType === 'phone_confirmation'){
			AnyBalance.trace('Требуется подтверждение по телефону');
			const phoneId = json.challenge.phoneId;
			const hint = json.challenge.hint;

			html = AnyBalance.requestPost(baseurl + '/registration-validations/auth/validate_phone_by_id', {
				csrf_token: csrf,
				track_id: track_id,
				phoneId: phoneId
			}, addHeaders({
				'X-Requested-With': 'XMLHttpRequest',
				Origin: baseurl,
				Referer: referer
			}));
			json = getJson(html);
			if(json.status !== 'ok'){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Запрос на валидацию не принят. Сайт изменен?');
			}

			if(!json.valid_for_flash_call){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Требуемое подтверждение не поддерживается');
			}


			html = AnyBalance.requestPost(baseurl + '/registration-validations/phone-confirm-code-submit', {
				csrf_token: csrf,
				track_id: track_id,
				phone_id: phoneId,
				confirm_method: 'by_flash_call',
				isCodeWithFormat: true
			}, addHeaders({
				'X-Requested-With': 'XMLHttpRequest',
				Origin: baseurl,
				Referer: referer
			}));
			json = getJson(html);
			if(json.status !== 'ok'){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Запрос на посылку кода не принят. Сайт изменен?');
			}
			

			const code = AnyBalance.retrieveCode('Пожалуйста, введите последние ' + json.code_length + ' цифры номер, который вам сейчас позвонит на ваш номер ' + json.number.masked_international);

			html = AnyBalance.requestPost(baseurl + '/registration-validations/phone-confirm-code', {
				csrf_token: csrf,
				track_id: track_id,
				code: code,
			}, addHeaders({
				'X-Requested-With': 'XMLHttpRequest',
				Origin: baseurl,
				Referer: referer
			}));
			json = getJson(html);
			if(json.status !== 'ok'){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Подтверждение кода не удалось. Сайт изменен?');
			}
			

		}else{
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Challenge не поддерживется: ' + challengeType);
		}

		
		html = AnyBalance.requestPost(baseurl + '/registration-validations/auth/challenge/commit', {
			csrf_token: csrf,
			track_id: track_id,
			challenge: challengeType,
		}, addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			Origin: baseurl,
			Referer: referer
		}));
		json = getJson(html);
		if(json.status !== 'ok'){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Подтверждение. Сайт изменен?');
		}
	}

	html = AnyBalance.requestGet(baseurl + '/auth/finish/?' + createUrlEncodedParams({
		track_id: track_id,
		retpath: retpath
	}), addHeaders({Referer: referer}));
		
	return html;
}