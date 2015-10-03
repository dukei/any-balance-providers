function main()
{
	AnyBalance.setDefaultCharset('utf-8');

  //AnyBalance.setResult({success: true, mycounter: 'Hello, World!'});
  
  
  // Получаем содержимое сайтА с уровнем воды
  		AnyBalance.trace('Connecting to meteo-nso.ru...');
        var info = AnyBalance.requestGet('http://meteo-nso.ru/pages/9');
        //AnyBalance.trace(info);
        
        // При успешном завершении извлечения значений счетчиков
        // в result обязательно должно быть поле success: true
        var result = {success: true};

		var matches;
		var nameout = "WL";
		//var regexp = /(style)/;
		//var regexp = /(Уровень воды [^<>]+ Обь)/;
		//так не работает, причём в логе провайдера html норм, а сам regexp -по-собачьи.
		//Уровень
		var regexp = /(\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0432\u043e\u0434\u044b [^<>]+ \u041e\u0431\u044c [\u0410-\u044f]+).+\s.+>(\d+)<\/p>/;
		
		AnyBalance.trace('RegExp: ' + regexp);
		
		if(matches = info.match(regexp))
        {
        	AnyBalance.trace('RegExp match 0: ' + matches[0]);
        	AnyBalance.trace('RegExp match 1: ' + matches[1]);
        	AnyBalance.trace('RegExp match 2: ' + matches[2]);
        	if(AnyBalance.isAvailable(nameout))
            {
            	result[nameout] = parseFloat(matches[2]);
                //result[nameout] = 1;
            }
        } //else
        //{
        //	result[nameout] = 2;
        //}
        
        
        //Возвращаем результат
        AnyBalance.setResult(result);
        
}





//из хтмл:
//<td style="width:160px; padding:5px 0; border:1px dashed #ccc;"><span style="color:#34b0e3; font-weight:bold;">Уровень воды (см) над 0 графика Обь Новосибирск</span></td>
//				<td style="font-weight:bold; border:1px dashed #ccc;"><p style="font-size:15px;">25</p></td>















