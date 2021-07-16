/**
Процедура входа в Яндекс. Унифицирована и выделена в отдельный файл для удобства встраивания
*/

function apiPost(url, params, message, reFatal){
	const html = AnyBalance.requestPost(url, {
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
		const error = json.errors.join('; ');
		throw new AnyBalance.Error('Пароль не принят: ' + error, null, /not_matched/.test(error));
	}
}

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
	
	function apiPost(verb, params, message, reFatal){
		const html = AnyBalance.requestPost(baseurl + '/' + verb, params, addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			Origin: baseurl,
			Referer: referer
		}));
		const json = getJson(html);
		if(json.status !== 'ok'){
			AnyBalance.trace(html);
			const error = json.errors.join('; ');
			throw new AnyBalance.Error(message + ': ' + error, null, reFatal && reFatal.test(error));
		}
		return json;
	}

	const csrf = getParam(html, /<input[^>]+name="csrf_token"[^>]*value="([^"]*)/i, replaceHtmlEntities);
	const process_uuid = getParam(html, /process_uuid=([^&"]*)/i, replaceHtmlEntities, decodeURIComponent);

	json = apiPost('registration-validations/auth/multi_step/start', {
		csrf_token: csrf,
		login: login,
		process_uuid: process_uuid,
		retpath: retpath,
		origin: origin		
	}, 'Вход не может быть выполнен. Сайт изменен?', /userNotFound|prohibitedsymbols/);
	
	if(!json.can_authorize){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Этот логин не может быть авторизован (неверный логин)', null, true);
	}
	const track_id = json.track_id;

	html = apiPost('registration-validations/auth/multi_step/commit_password', {
		csrf_token: csrf,
		track_id: track_id,
		password: password,
		retpath: retpath
	}, 'Пароль не принят', /not_matched/);

	if(json.state === 'auth_challenge'){
		AnyBalance.trace('Потребовалась дополнительная проверка входа');

		html = apiPost('registration-validations/auth/challenge/submit', {
			csrf_token: csrf,
			track_id: track_id,
		}, 'Запрос проверки: ' + error);

		const challengeType = json.challenge.challengeType;

		if(challengeType === 'phone_confirmation'){
			AnyBalance.trace('Требуется подтверждение по телефону');
			const phoneId = json.challenge.phoneId;
			const hint = json.challenge.hint;

			html = apiPost('registration-validations/auth/validate_phone_by_id', {
				csrf_token: csrf,
				track_id: track_id,
				phoneId: phoneId
			}, 'Запрос на валидацию не принят');

			if(!json.valid_for_flash_call){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Требуемое подтверждение не поддерживается');
			}


			html = apiPost('registration-validations/phone-confirm-code-submit', {
				csrf_token: csrf,
				track_id: track_id,
				phone_id: phoneId,
				confirm_method: 'by_flash_call',
				isCodeWithFormat: true
			}, 'Запрос на посылку кода не принят');

			const code = AnyBalance.retrieveCode('Пожалуйста, введите последние ' + json.code_length + ' цифры номер, который вам сейчас позвонит на ваш номер ' + json.number.masked_international);

			html = apiPost('registration-validations/phone-confirm-code', {
				csrf_token: csrf,
				track_id: track_id,
				code: code,
			}, 'Подтверждение кода не удалось');
			

		}else{
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Challenge не поддерживется: ' + challengeType);
		}

		html = AnyBalance.requestPost(baseurl + '/registration-validations/auth/challenge/commit', {
			csrf_token: csrf,
			track_id: track_id,
			challenge: challengeType,
		}, 'Ошибка подтверждения');
	}

	html = AnyBalance.requestGet(baseurl + '/auth/finish/?' + createUrlEncodedParams({
		track_id: track_id,
		retpath: retpath
	}), addHeaders({Referer: referer}));

	return html;
}