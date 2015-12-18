/**
Пример конфигурации:
var g_gwtCfg = {
	url: 'https://ikus.pesc.ru/IKUSUser/',
	strong_name: '\\b%VARNAME%,\\w+\\],(\\w+)\\)',
	auth_nocache: 'userAuth/userAuth.nocache.js',
}

*/

function gwtEscape(str){
    return str.replace(/\\/g, '\\\\').replace(/\|/g, '\!');
}

function gwtGetStrongName(js, cfg){
    var varName = getParam(js, null, null, /(\w+)='safari'/);
    if(!varName)
        throw new AnyBalance.Error('Не удаётся найти $strongName: ссылку на браузер.');
    var re = new RegExp(cfg.strong_name.replace(/%VARNAME%/g, varName));
    var varNameStrong = getParam(js, null, null, re);
    if(!varNameStrong)
        throw new AnyBalance.Error('Не удаётся найти $strongName: имя переменной.');
    re = new RegExp('\\b'+varNameStrong+'=\'([^\']*)');
    var val = getParam(js, null, null, re);
    if(!val)
        throw new AnyBalance.Error('Не удаётся найти $strongName: значение переменной.');
    return val;
}

function gwtGetJSON(str, reFatal){
    if(/^\/\/EX/i.test(str)){
        var error = getParam(str, null, null, /Exception[^"]*","([^"]*)"\]/);
        throw new AnyBalance.Error(error, null, (reFatal || /Неверный логин или пароль/i).test(error));
    }

    var json = getParam(str, null, null, /\/\/OK(.*)/);
    if(!json)
        throw new AnyBalance.Error('Ошибка получения ответа: ' + str);
    return getJson(json);
}

function gwtLoadStrongName(cfg){
	var js = AnyBalance.requestGet(cfg.url + cfg.auth_nocache, this.g_headers);
	return gwtGetStrongName(js, cfg);
}

function gwtHeaders(strongName, cfg){
	return addHeaders({ 
        'Content-Type': 'text/x-gwt-rpc; charset=UTF-8', 
        'X-GWT-Module-Base':cfg.url,
        'X-GWT-Permutation':strongName
    });
}

function makeReplaces(str, cfg){
    for(var i in cfg){
        str = str.replace(new RegExp('%' + i + '%', 'g'), cfg[i]);
    }
    return str;
}

