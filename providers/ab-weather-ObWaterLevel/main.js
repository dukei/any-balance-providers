//Что это:
//Это провайдер для программы AnyBalance.
//Показывает уровень воды в Оби в районе Новосибирска.
//Инфа с сайта http://meteo-nso.ru/pages/9

function main()
{
	AnyBalance.setDefaultCharset('utf-8');

  //AnyBalance.setResult({success: true, mycounter: 'Hello, World!'});
  
  
  // Получаем содержимое сайтА с уровнем воды
  		AnyBalance.trace('Connecting to meteo-nso.ru...');
        var info = AnyBalance.requestGet('http://meteo-nso.ru/pages/9');
        //AnyBalance.trace(info); //всё принятое в лог
        
        // При успешном завершении извлечения значений счетчиков
        // в result обязательно должно быть поле success: true
        var result = {success: true};

		var matches; //
		var nameout; //имя параметра, который будет хранить данные счётчика
		var regexp; //паттерн для вырезания инфы для счётчика
		
		     
		        
		//------------------------------------------------------------------
        //Уровень воды в Оби
        //------------------------------------------------------------------
		        
		nameout = "OBWL";
//		//из хтмл:
//		//Уровень воды (см) над 0 графика Обь Новосибирск</span></td>
//		//				<td style="font-weight:bold; border:1px dashed #ccc;"><p style="font-size:15px;">25</p></td>
//		
//				//var regexp = /(Уровень воды [^<>]+ Обь)/;
//				//так не работает, причём в логе провайдера html норм, а сам regexp -по-собачьи.
//				//Уровень
		regexp = /(\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0432\u043e\u0434\u044b [^<>]+ \u041e\u0431\u044c [\u0410-\u044f]+).+\s.+>(\d+)<\/p>/;
 		getRate(result, info, regexp, nameout);      
        
        
        //------------------------------------------------------------------
        //Уровень воды в ОВХ
        //------------------------------------------------------------------
        nameout = "VHWL";
//из хтмл:
//Средний уровень воды водохранилища (см, м БС) в 8 час утра</span></td>
//				<td style="font-weight:bold; border:1px dashed #ccc;"><p style="font-size:15px;">585 см или 113.35 м БС</p>
        
        // /([ А-я]+ровень воды водо[\(\),\d А-я]+)/
        regexp = /([ \u0410-\u044f]+\u0440\u043e\u0432\u0435\u043d\u044c \u0432\u043e\u0434\u044b \u0432\u043e\u0434\u043e[\(\),\d \u0410-\u044f]+).+\s.+>(\d+).+<\/p>/;
		getRate(result, info, regexp, nameout); 
        
        
        
               
        
        //------------------------------------------------------------------
        //Температура воды в Оби
        //------------------------------------------------------------------
        nameout = "OBT";
        
//из хтмл:
//>р.Обь Новосибирск,  t°C</span></td>
//				<td style="font-weight:bold; border:1px dashed #ccc;"><p style="font-size:15px;">8,0</p></td>
//			</tr>
        // /([\. А-я]+ Обь [А-я]+ t.C).+\s.+>([,\d]+)<\/p>/
        //regexp = /([\.\u0410-\u044f]+\u041e\u0431\u044c [,\u0410-\u044f]+ t.C).+\s.+>([.,\d]+)<\/p>/;
        regexp = /([\.\u0410-\u044f]+\u041e\u0431\u044c [,\u0410-\u044f]+ +t.C).+\s.+>([.,\d]+)<\/p>/;
        
        getRate(result, info, regexp, nameout); 
        
        
                //------------------------------------------------------------------
        //Температура воды в ОВХ
        //------------------------------------------------------------------
        nameout = "VHT";
        
//из хтмл:
//Новосибирское водохранилище, t°C</span></td>
//				<td style="font-weight:bold; border:1px dashed #ccc;"><p style="font-size:15px;">9,3</p></td>        // /([\. А-я]+ Обь [А-я]+ t.C).+\s.+>([,\d]+)<\/p>/
        
        //regexp = /([\.\u0410-\u044f]+\u041e\u0431\u044c [,\u0410-\u044f]+ +t.C).+\s.+>([.,\d]+)<\/p>/;
        // ([А-я] водо[А-я], +t.C).+\s.+>([,\d]+)<\/p>
        regexp = /([\u0410-\u044f]+ \u0432\u043e\u0434\u043e[\u0410-\u044f]+, +t.C).+\s.+>([.,\d]+)<\/p>/;
        
        getRate(result, info, regexp, nameout); 
        
        
        
        

        //Возвращаем результат
        AnyBalance.setResult(result);
        
}






function getRate(result, info, regexp, nameout)
{
		AnyBalance.trace('------------- Obtain ' + nameout + ' ----------------');
				
		AnyBalance.trace('RegExp: ' + regexp);
		if(matches = info.match(regexp))
        {
        	//что нашлось всё в лог
        	matches.forEach(function(item, i, arr) 
        						{
        							AnyBalance.trace('RegExp match ' + i + ': ' + item);
								}
							);
        	if(AnyBalance.isAvailable(nameout))
            {
            	result[nameout] = parseFloat(matches[2].replace(',','.'));
                AnyBalance.trace('Put ' + result[nameout] + ' to ' + nameout);
            }
        }else
        {
        	AnyBalance.trace('Error: RegExp not match');
        	result[nameout] = 0;
        }
}



