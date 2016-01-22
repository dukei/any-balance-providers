/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.etisalat.eg/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Enter login!');
	AB.checkEmpty(prefs.password, 'Enter password!');


	var html = AnyBalance.requestGet(baseurl + 'etisalat/portal/home', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting to the site! Try to refresh the data later.');
	}

	//Нужно получить OAM_REQ
	html = AnyBalance.requestGet(baseurl+'ecare/adfAuthentication', g_headers);

	var oam_req = AB.getParam(html, null, null, /<input[^>]+name="oam_req"[^>]+value="([\s\S]*?)"/i);
	if(!oam_req)
		throw new AnyBalance.Error("Can't find params. Site changed?");

	html = AnyBalance.requestPost(baseurl + 'oam/server/auth_cred_submit', {
		OAM_REQ: oam_req,
		username: prefs.login,
		password: prefs.password,
		fbEmail:'',
		saeToken: '',
		error: ''
	}, AB.addHeaders({
		Referer: baseurl + 'LoginApp/index.jsp'
	}));

	var params;

	if (/error/i.test(html)) {
		var errorForm = AB.getParam(html, null, null, /<form[^>]*>([\s\S]*?)<\/form>/i);
		if(!errorForm)
			throw new AnyBalance.Error("Can't find form with error. Site changed?");

		params = createParams(errorForm);

		html = AnyBalance.requestPost(baseurl+'LoginApp/index.jsp', params, AB.addHeaders({
			'Referer': baseurl+'oam/server/auth_cred_submit'
		}));

		if(params.p_error_code) {
			var error = AB.getParam(html, null, null, new RegExp('errorCode\\s*==\\s*"'+params.p_error_code+'"[\\s\\S]*?innerHTML\\s*=\\s*\'([\\s\\S]*?)\'', 'i'), AB.replaceTagsAndSpaces);
			if (error)
				throw new AnyBalance.Error(error, null, /يوجد خطأ فى اسم المستخدم او كلمة المرور/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error("Can't login to selfcare. Site changed?");

	}


	html = AnyBalance.requestGet(baseurl+'ecare/faces/oracle/webcenter/portalapp/pages/Account/Landing.jspx?locale=ar');

	var result = {success: true};

	if(isAvailable(['fio', 'phone'])) {

		var infoHREF = AB.getParam(html, null, null, /getElementById\("pt1:portlet1::_iframe"\)[^"]*"([\s\S]*?)"/i);
		if(!infoHREF)
			AnyBalance.trace("Can't find page with name & phone info. Site changed?");
		else {
			html = AnyBalance.requestGet(infoHREF, g_headers);

			var fName = AB.getParam(html, null, null, /<table[^>]+id="[^"]+editFirstSection"[^>]*>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces) || '';
			var sName = AB.getParam(html, null, null,/<table[^>]+id="[^"]+editFirstSection"[^>]*>(?:[\s\S]*?<span[^>]*>){2}([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces) || '';

			AB.getParam(fName + ' ' + sName, result, 'fio');
			AB.getParam(html, result, 'phone', /<span[^>]+id="[^"]+outputMobile"[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
		}

	}

	if(isAvailable(['balance', 'acc_num'])) {

		var href = AB.getParam(html, null, null, /<input[^>]+name="org\.apache\.myfaces\.trinidad\.faces\.FORM"[^>]*>[\s\S]*?adfcustompprurlexpando="([\s\S]*?)"/i);
		if(!href)
			AnyBalance.trace("Can't find page with balance info. Site changed?");
		else {

			params = createParams(html);

			params.event = AB.getParam(html, null, null, /معلومات عن الفواتير[\s\S]*?<a[^>]+id="([\s\S]*?)"/);
			if(!params.event)
				throw new AnyBalance.Error("Can't find event param. Site changed?");

			params['event.'+params.event] = '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>';

			html = AnyBalance.requestPost(href, params, addHeaders({
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Accept': '*/*',
				'X-TS-AJAX-Request': true
			}));

			AB.getParam(html, result, 'balance', /(?:&lt;|<)span[^>]+class="boxes af_panelGroupLayout"[^>]*>(?:[\s\S]*?(?:<|&lt;)p[^>]*(?:>|&rt;)){2}([\s\S]*?)(?:&lt;|<)\/p/i, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(html, result, 'acc_num', /(?:&lt;|<)div[^>]+class="padder"(?:[^>]*(?:>|&rt;)){4}([\s\S]*?)(?:&lt;|<)\/div/i, AB.replaceTagsAndSpaces);
		}
	}
	
	AnyBalance.setResult(result);
}
function createParams (from) {
	return AB.createFormParams(from, function(params, str, name, value) {
		return value;
	});
}