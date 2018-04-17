/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Отображает данные о копилке. При настройке провайдера нужно указать сумму, которую вы хотите накопить. При обновлении провайдер показывает окно, где нужно ввести сумму, которую вы только что добавили в копилку. Провайдер может показать, сколько уже накоплено, цель и сколько осталось накопить.
*/

function main() {
	var result={
        success: true
    };

	var prefs = AnyBalance.getPreferences();
	var saved = AnyBalance.getData('saved', 0);
    
    try {
		var value = AnyBalance.retrieveCode("Сколько вы хотите добавить?", null, {inputType: 'number'});
		saved = saved + parseInt(value);
    	AnyBalance.setData('saved', saved);
		AnyBalance.saveData();
	} catch(e) {
		
	}
        
    result.purpose = prefs.purpose;
    result.saved = saved;
    result.remain = prefs.purpose - saved;

	AnyBalance.setResult(result);
}
