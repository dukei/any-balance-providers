/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',

};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://tattg.gazprom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	
	var html = AnyBalance.requestGet(baseurl + 'MyAccount', g_headers);
    
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    html = AnyBalance.requestGet(baseurl + 'MyAccount/viewdata.html?ap=' + (prefs.ap || '01') + '&account=' + prefs.login, g_headers);
    
    html = AnyBalance.requestGet(baseurl + 'MyAccount/' + getDataPath(prefs.ap, prefs.login),  addHeaders({Referer: baseurl + 'MyAccount/viewdata.html?ap=' + prefs.ap + '&account=' + prefs.login}));
    
	// var params = createFormParams(html, function(params, str, name, value) {
		// if (name == 'login') 
			// return prefs.login;
		// else if (name == 'password')
			// return prefs.password;

		// return value;
	// });
	
	// html = AnyBalance.requestPost(baseurl + 'login', {
		// login: prefs.login,
		// password: prefs.password,
		// 'Remember': 'false'
	// }, addHeaders({Referer: baseurl + 'login'}));
	
	// if (!/logout/i.test(html)) {
		// var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		// if (error)
			// throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		// AnyBalance.trace(html);
		// throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	// }



// Удаление "лишних" данных
  // datapath = getDataPath(getUrlVars()['ap'], getUrlVars()['account']);
  datapath = getDataPath(prefs.ap, prefs.login);
  // var xml = loadXMLDoc(baseurl + 'MyAccount/' + datapath);
  var xml = html;
  var path = "abonent/abonentdata[account != " + prefs.login + "]";
  // try {
    // if (window.ActiveXObject || xhttp.responseType=="msxml-document") {
      // xml.setProperty("SelectionLanguage","XPath");
      // nodes = xml.selectNodes(path);
      // for (i = nodes.length; i > 0 ; i--) {
        // parentnode = nodes[i-1].parentNode;
        // parentnode.removeChild(nodes[i-1]);
      // }
    // }
    // // code for Chrome, Firefox, Opera, etc.
    // else
      // if (document.implementation && document.implementation.createDocument) {
        var nodes = xml.evaluate(path, xml, null, XPathResult.ANY_TYPE, null);
        nodeArray = new Array(9);
        var i = 0;
        var result=nodes.iterateNext();
        while (result) {
          nodeArray[i++] = result;
          result = nodes.iterateNext();
        }
        for (i=nodeArray.length;i>0;i--) {
          if (nodeArray[i-1] != null) {
            parentnode = nodeArray[i-1].parentNode;
            parentnode.removeChild(nodeArray[i-1]);
           }
        }
      // }
  // }
  // catch(e) {}



	
	var result = {success: true};
    
	
	getParam(html, result, 'period', /<abonent><moment>([\s\S]*?)<\/moment/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /<account>([\s\S]*?)<\/account>/i, replaceTagsAndSpaces, html_entity_decode);
    
    
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'fio', /Имя абонента:(?:[\s\S]*?<b[^>]*>){1}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'deadline', /Действителен до:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

// Формирование пути к файлу с данными абонента "account" из а/пункта "ap"
function getDataPath(ap, account) {
    account = (account - account % 10) +'';
    var cnt = 8 - account.length;
    for(var i = 0; i < cnt; i++) {
        account = "0" + account;
    }
    return 'datastore/'+ap+'/'+account+'.xml';
}


// function getUrlVars() {
  // var vars = [], hash;
  // var hashes = location.href.slice(location.href.indexOf('?') + 1).split('&');
  // for(var i = 0; i < hashes.length; i++) {
    // hash = hashes[i].split('=');
    // vars.push(hash[0]);
    // vars[hash[0]] = hash[1];
  // }
  // return vars;
// }

// function loadXMLDoc(filename) {
  // try {
    // xhttp = createRequestObject();
  // }
  // catch(e) { 
  // // alert(e.message); 
  // return null; }

  // xhttp.open("GET", filename, false);
  // xhttp.send("");
  // return xhttp.responseXML;
// }

// function createRequestObject() {
  // if (typeof XMLHttpRequest == 'undefined') {
    // XMLHttpRequest = function() {
      // try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } // По умолчанию это свойство в данном случае отключено: var source = new ActiveXObject("Msxml2.DOMDocument.6.0"); source.setProperty("AllowDocumentFunction", true);
        // catch(e) {}
      // try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); }
        // catch(e) {}
      // try { return new ActiveXObject("Msxml2.XMLHTTP"); }
        // catch(e) {}
      // try { return new ActiveXObject("Microsoft.XMLHTTP"); }
        // catch(e) {}
      // throw new Error("Работа с вашим браузером не поддерживается."); // This browser does not support XMLHttpRequest
    // };
  // }
  // return new XMLHttpRequest();
// }
