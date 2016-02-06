function encryptPass(pass, map){
	if(map){
		var ch='',i=0,k=0,TempPass='',PassTemplate=map.split(','), Pass='';
		TempPass=pass;
		while(TempPass!=''){
			ch=TempPass.substr(0, 1);
			k = ch.charCodeAt(0);
			if(k>0xFF) k-=0x350;
			if(k==7622) k=185;
			TempPass=TempPass.length>1?TempPass.substr(1, TempPass.length):'';
			if(Pass!='')Pass=Pass+';';
			Pass=Pass+PassTemplate[k];
		}
        return Pass;
	}else{
		return pass;
	}

}

var g_headers = {
    'Accept-Language': 'ru, en',
    BSSHTTPRequest:1,
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

var g_bss_sessionId;
var g_bss_info;

function loginBSS(baseurl){
	if(!g_bss_info){
        var prefs = AnyBalance.getPreferences();
        
		checkEmpty(prefs.login, 'Введите логин!');
		checkEmpty(prefs.password, 'Введите пароль!');
	    
        var html = AnyBalance.requestGet(baseurl + 'T=RT_2Auth.BF');
        
		if(!html || AnyBalance.getLastStatusCode() > 400){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
		}
	    
        var mapId = getParam(html, null, null, /<input[^>]*name="MapID"[^>]*value="([^"]*)"/i);
        var map = getParam(html, null, null, /var\s+PassTemplate\s*=\s*new\s+Array\s*\(([^\)]*)/i);
        
        var pass = encryptPass(prefs.password, map);
        
        html = AnyBalance.requestPost(baseurl, {
            tic: 0,
            T:'RT_2Auth.CL',
            A:prefs.login,
            B:pass,
            L:'russian',
            C:'',
            IdCaptcha:'',
            IMode:'',
            sTypeInterface:'default',
            MapID:mapId || ''
        }, g_headers);
        
        var error = getParam(html, null, null, /<BSS_ERROR>\d*\|?([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /логина или пароля/i.test(error));
        
        var jsonInfo = getParam(html, null, null, /ClientInfo=(\{[\s\S]*?\})\s*(?:<\/div>|$)/i);
        if(!jsonInfo)
            throw new AnyBalance.Error("Не удалось найти информацию о сессии в ответе банка.");
        
        jsonInfo = JSON.parse(jsonInfo);
        
        var html = AnyBalance.requestPost(baseurl, {
            SID:jsonInfo.SID,
            tic:1,
            T:'rt_0clientupdaterest.doheavyupd'
        }, g_headers);
        
        var i=0;
        do{
            AnyBalance.trace('Ожидание обновления данных: ' + (i+1));
            html = AnyBalance.requestPost(baseurl, {
                SID:jsonInfo.SID,
                tic:1,
                T:'rt_0clientupdaterest.CheckForAcyncProcess'
            }, g_headers);
            var opres = getParam(html, null, null, /^\s*(?:<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>)?\d+\s*$/i, replaceTagsAndSpaces, html_entity_decode);
            if(opres){
                AnyBalance.trace('Обновление данных закончено. ' + opres);
                break; //Всё готово, надо получать баланс
            }
            opres = getParam(html, null, null, /^\s*(?:<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>)\s*$/i, replaceTagsAndSpaces, html_entity_decode);
            if(opres){
                AnyBalance.trace('Обновление данных закончено с ошибкой: ' + opres);
                break; //Всё готово, надо получать баланс
            }
            if(++i > 10){  //На всякий случай не делаем больше 10 попыток
                AnyBalance.trace('Не удалось за 10 попыток обновить баланс, получаем старое значение...');
                break;
            }
            AnyBalance.sleep(3000);
        }while(true);
        
        g_bss_info = jsonInfo;
        g_bss_sessionId = jsonInfo.SID;

        __setLoginSuccessful();
    }else{
    	AnyBalance.trace('Используем существующую сессию...');
    }

    return g_bss_info;
}

