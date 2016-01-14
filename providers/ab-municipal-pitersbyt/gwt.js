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
    var nameBrowser = getParam(js, null, null, /(\w+)='safari'/);
    var nameLang = getParam(js, null, null, /(\w+)='ru'/);
    var nameDevice = getParam(js, null, null, /(\w+)='desktop'/);

    if(!nameBrowser && /%VARNAME_BROWSER%/.test(cfg.strong_name)){
    	AnyBalance.trace(js);
        throw new AnyBalance.Error('Cannot find $strongName: reference to browser.');
    }

    if(!nameLang && /%VARNAME_LANG%/.test(cfg.strong_name)){
    	AnyBalance.trace(js);
        throw new AnyBalance.Error('Cannot find $strongName: reference to language.');
    }
    
    if(!nameDevice && /%VARNAME_DEVICE%/.test(cfg.strong_name)){
    	AnyBalance.trace(js);
        throw new AnyBalance.Error('Cannot find $strongName: reference to device.');
    }

    var re = new RegExp(makeReplaces(cfg.strong_name, {VARNAME_BROWSER: nameBrowser, VARNAME_LANG: nameLang, VARNAME_DEVICE: nameDevice}));

    var varNameStrong = getParam(js, null, null, re);
    if(!varNameStrong)
        throw new AnyBalance.Error('Could not find $strongName: variable name.');
    re = new RegExp('\\b'+varNameStrong+'=\'([^\']*)');
    var val = getParam(js, null, null, re);
    if(!val)
        throw new AnyBalance.Error('Could not find $strongName: variable value.');
    return val;
}

function gwtGetJSON(str, reFatal){
    if(/^\/\/EX/i.test(str)){
        var error = getParam(str, null, null, /Exception[^"]*","([^"]*)"\]/);
        throw new AnyBalance.Error(error, null, (reFatal || /Неверный логин или пароль/i).test(error));
    }

    var json = getParam(str, null, null, /\/\/OK(.*)/);
    if(!json)
        throw new AnyBalance.Error('Response error: ' + str);
    return getJsonEval(json);
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

