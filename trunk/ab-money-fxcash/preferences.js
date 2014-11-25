/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for FX Rebate
WWW: http://www.fxcash.ru
WWW: http://www.forexcashbackrebate.com
mailto:wtiger@mail.ru
*/
function onChangeType(){

	var props = AnyBalance.getPreferenceProperties({
		fxc: {value: ''},
		login: {visible: ''},
		password: {visible: ''},
		fcbr: {value: ''},
		login_fcbr: {visible: ''},
		password_fcbr: {visible: ''}
	});

	if(props.fxc.value == 1){
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			password: {visible: true}
		});
	}else{
		AnyBalance.setPreferenceProperties({
			login: {visible: false},
			password: {visible: false}
		});
	}

	if(props.fcbr.value == 1){
		AnyBalance.setPreferenceProperties({
			login_fcbr: {visible: true},
			password_fcbr: {visible: true}
		});
	}else{
		AnyBalance.setPreferenceProperties({
			login_fcbr: {visible: false},
			password_fcbr: {visible: false}
		});
	}

}

function main(){
	AnyBalance.addCallback('change#fxc', onChangeType);
	AnyBalance.addCallback('change#fcbr', onChangeType);
	onChangeType();
}
