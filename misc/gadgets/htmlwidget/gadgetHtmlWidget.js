editAreaLoader.init({
	id : "textarea_1"		// textarea id
	,syntax: "html"			// syntax to be uses for highgliting
	,start_highlight: true		// to display with highlight mode on start-up
        ,change_callback: "onChangeText"
});

var predefined = [
      "1 ряд",
      "2 ряда (4:3)",
      "4 ряда (2:2:2:1)"
];

var predefinedValues = [
"<table><tr>\n\
\u0020\u0020<td ifavailable=\"0\">\n\
\u0020\u0020\u0020\u0020(@0)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@0*m) / (@0*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"1\">\n\
\u0020\u0020\u0020\u0020(@1)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@1*m) / (@1*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"2\">\n\
\u0020\u0020\u0020\u0020(@2)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@2*m) / (@2*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"3\">\n\
\u0020\u0020\u0020\u0020(@3)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@3*m) / (@3*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"4\">\n\
\u0020\u0020\u0020\u0020(@4)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@4*m) / (@4*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"5\">\n\
\u0020\u0020\u0020\u0020(@5)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@5*m) / (@5*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"6\">\n\
\u0020\u0020\u0020\u0020(@6)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@6*m) / (@6*d)</font></small>\n\
\u0020\u0020</td>\n\
</tr></table>\n\
",
        
"<table><tr>\n\
\u0020\u0020<td ifavailable=\"0\">\n\
\u0020\u0020\u0020\u0020(@0)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@0*m) / (@0*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"1\">\n\
\u0020\u0020\u0020\u0020(@1)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@1*m) / (@1*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"2\">\n\
\u0020\u0020\u0020\u0020(@2)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@2*m) / (@2*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"3\">\n\
\u0020\u0020\u0020\u0020(@3)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@3*m) / (@3*d)</font></small>\n\
\u0020\u0020</td>\n\
</tr></table>\n\
<table><tr>\n\
\u0020\u0020<td ifavailable=\"4\">\n\
\u0020\u0020\u0020\u0020(@4)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@4*m) / (@4*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"5\">\n\
\u0020\u0020\u0020\u0020(@5)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@5*m) / (@5*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"6\">\n\
\u0020\u0020\u0020\u0020(@6)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@6*m) / (@6*d)</font></small>\n\
\u0020\u0020</td>\n\
</tr></table>",
        
"<table><tr>\n\
\u0020\u0020<td ifavailable=\"0\">\n\
\u0020\u0020\u0020\u0020(@0)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@0*m) / (@0*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"1\">\n\
\u0020\u0020\u0020\u0020(@1)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@1*m) / (@1*d)</font></small>\n\
\u0020\u0020</td>\n\
</tr></table>\n\
<table><tr>\n\
\u0020\u0020<td ifavailable=\"2\">\n\
\u0020\u0020\u0020\u0020(@2)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@2*m) / (@2*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"3\">\n\
\u0020\u0020\u0020\u0020(@3)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@3*m) / (@3*d)</font></small>\n\
\u0020\u0020</td>\n\
</tr></table>\n\
<table><tr>\n\
\u0020\u0020<td ifavailable=\"4\">\n\
\u0020\u0020\u0020\u0020(@4)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@4*m) / (@4*d)</font></small>\n\
\u0020\u0020</td>\n\
\u0020\u0020<td ifavailable=\"5\">\n\
\u0020\u0020\u0020\u0020(@5)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@5*m) / (@5*d)</font></small>\n\
\u0020\u0020</td>\n\
</tr></table>\n\
<table><tr>\n\
\u0020\u0020<td ifavailable=\"6\">\n\
\u0020\u0020\u0020\u0020(@6)<br/>\n\
\u0020\u0020\u0020\u0020<small><font color=\"#CCCCCC\">(@6*m) / (@6*d)</font></small>\n\
\u0020\u0020</td>\n\
</tr></table>"
];

var previewText = "Выберите шаблон или отредактируйте шаблон вручную и кликните здесь для предварительного просмотра";

function onChangeText(){
    var val = $('#selectPredefined').val();
    if(val != "custom"){
        var i = parseInt($('#selectPredefined').val());
        if(predefinedValues[i] != editAreaLoader.getValue("textarea_1"))
            $('#selectPredefined').val("custom");
    }
    
    val = editAreaLoader.getValue("textarea_1");
    $('#widget_preview').html(val || previewText);
    localAdjust();
}

$(function(){
     $('#selectPredefined')
         .append($("<option></option>")
         .attr("value","custom")
         .text("Custom template")); 
         
    $.each(predefined, function(key, value) {   
         $('#selectPredefined')
             .append($("<option></option>")
             .attr("value",key)
             .text(value)); 
    });
    
    function syncSelect(){
        var val = $('#selectPredefined').val();
        if(val != "custom"){
            var i = parseInt($('#selectPredefined').val());
            editAreaLoader.setValue("textarea_1", predefinedValues[i]);
        }
    }
    
    $('#selectPredefined').change(syncSelect);
    
    $('#selectPredefined').val("custom");
    
    $('#btnShow').click(function(){
       var thelink = 'http://qrcoder.ru/code/?'+encodeURIComponent(editAreaLoader.getValue("textarea_1")) + '&5&0';
       $('#qrcode').html('<img src="' + thelink + '" width="605" height="605"/>')
		.dialog({modal:true, width: 'auto', height: 'auto', title: 'Scan this QR code with AnyBalance or <a href="' + thelink +'">share</a> it.'});
       localAdjust();
    });
    
    syncSelect();
    $('#widget_preview').html(previewText);
    
    localAdjust();
    window.setTimeout(localAdjust, 1000);
    window.setTimeout(localAdjust, 3000);
});

function localAdjust(){
  try{
    if(gadgets)
        gadgets.window.adjustHeight();
  }catch(e){}
}

