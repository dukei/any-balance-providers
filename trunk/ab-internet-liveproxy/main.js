function main(){
        AnyBalance.trace('Connecting to liveproxy...');
        
        var result = {success: true};

        var prefs = AnyBalance.getPreferences();


        
        var info = AnyBalance.requestPost('http://client.liveproxy.com.ua/index.php', {
           
                login: prefs.login,
				 password: prefs.password
        },{
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'anyprovider'
});
       //AnyBalance.requestPost(/*string*/ url, /*string, object or null*/ data, /*object or null*/headers, /*object or null*/options) throws AnyBalance.Error //since level 1,3,7
 
        var xmlDoc = $.parseXML(info),
          $xml = $(xmlDoc);
        
       
        
        if(AnyBalance.isAvailable('date')){
                result.date = $xml.find('date').text(); //Сводим к золоту
        }
                if(AnyBalance.isAvailable('end')){
                result.end = $xml.find('end').text(); //Сводим к золоту
        }    

        
		
           
        if(AnyBalance.isAvailable('fio')){
                result.fio = $xml.find('fio').text(); //Сводим к золоту
        }   
        if(AnyBalance.isAvailable('state')){
                result.state = $xml.find('state').text(); //Сводим к золоту
        }  		
            if($xml.find('error').text()=='login'){
			  throw new AnyBalance.Error('неправильный логин или пароль 691');
                //result.error = $xml.find('error').text(); //Сводим к золоту
        }
        AnyBalance.setResult(result);
}