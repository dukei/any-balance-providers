class RuCaptcha {
	constructor(key){
		this.key = key;
		this.baseurl = 'https://rucaptcha.com/';
	}

	async solveReCaptcha2(sitekey, {url, userAgent}){
		let id = await this.sendToRecognition({
			method: 'userrecaptcha',
			googlekey: sitekey,
			pageurl: url,
			userAgent: userAgent,
		});

		return await this.waitForResult(id);
	}

	async sendToRecognition(params){
		let tryno = 1, res;
		do{
			await AnyBalance.trace('Отправка капчи на распознавание, попытка ' + tryno);
			if(tryno > 1){
				await AnyBalance.sleep(5000); //Ждем слота на распознавание
			}
		    res = await AnyBalance.requestPost(this.baseurl + 'in.php', joinObjects({
		    		key: this.key,
		    		soft_id: '1351', //AnyBalance
		    	}, params)
		    );
		    await AnyBalance.trace('Статус принятия капчи: ' + res.getText());
		}while(/ERROR_NO_SLOT_AVAILABLE/.test(res.getText()) && tryno++ < 5);
	    
		var captcha_id = getParam(res.getText(), /^OK\|(\S+)/);
		if(!captcha_id)
			throw new AnyBalance.Error('Не удалось отправить капчу на распознавание! ' + res.getText());
	    
		return captcha_id;
	}

    async waitForResult(captcha_id){
   		let res, tryno=1;
		do{
        	try{
        		res = await AnyBalance.requestGet(this.baseurl + 'res.php?' + createUrlEncodedParams({key: this.key, action: 'get', id: captcha_id}));
        		var code = res.getLastStatusCode();
        		if(code >= 400)
        			throw new AnyBalance.Error(code + ' ' + res.getLastStatusString());
        		if(!/^CAPCHA_NOT_READY/.test(res.getText()))
        			break;
        	}catch(e){
        		await AnyBalance.trace('Ошибка проверки статуса капчи (попытка ' + tryno + '): ' + e.message);
        		if(tryno++ >= 5){
        			throw e;
        		}
        	}
        	//Капча не готова. Надо ждать.
        	await AnyBalance.sleep(5000);
		}while(true);
	    
		const captchaValue = getParam(res.getText(), /^OK\|([\s\S]*\S)/);

		if(!captchaValue){
			throw new AnyBalance.Error('Не удалось распознать капчу: ' + res.getText());
		}

		return captchaValue;
	}
}
