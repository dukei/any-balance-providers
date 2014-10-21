Option Explicit

Dim returnValue
returnValue = createInput("У вас есть 10 секунд на ввод нужного значения или сообщение закроется само собой. B)","Заголовок сообщения",10000)

MsgBox returnValue,vbInformation,"Введённое значение"

'Функция создания окна похожего на inputBox с таймаутом в миллисекундах
Function createInput(prompt,title,timeout)
    Dim content, wnd, status
    'Задаём HTML код окна
    content =  "<html>" &_
                    "<head>" &_
                        "<style>" &_
                            "*{font-family:Tahoma;font-size:13px;}" &_
                            "button,textarea,span{position:absolute;}" &_
                            "button{width:80px;}" &_
                            "#lblPrompt{left:10px;top:10px;overflow:hidden;width:250px;height:80px;}" &_
                            "#btnOk{left:265px;top:10px;}" &_
                            "#btnCancel{left:265px;top:40px;}" &_
                            "#inpText{top:98px;width:330px;}" &_
                        "</style>" &_
                    "</head>" &_
                    "<body bgcolor=#F0F0F0>" &_
                        "<span id='lblPrompt'></span>" &_
                        "<button id='btnOk' onclick='window.returnValue=inpText.value;window.status=1'>OK</button>" &_
                        "<button id='btnCancel' onclick='window.status=1;'>Отмена</button>" &_
                        "<textarea id='inpText'></textarea>" &_
                    "</body>" &_
                "</html>"

    'Создаём нужное нам окошко (без скролов, без меню и т.п)
    Set wnd = createWindow(content,"border=dialog " &_
                                "minimizeButton=no " &_
                                "maximizeButton=no " &_
                                "scroll=no " &_
                                "showIntaskbar=yes " &_
                                "contextMenu=no " &_
                                "selection=no " &_
                                "innerBorder=no")

    
    'Устанавливаем таймер таймаута
    wnd.execScript "window.setTimeout('window.close()'," & Clng(timeout) & ");window.returnValue=''"

    'Заполняем нужные нам объекты текстом
    With wnd
        'По умолчанию выставляем статус 0 (потом будем проверять его в цикле)
        .status = 0
        'Ставим фокус на кнопку OK
        .btnOk.focus
        'Задаём заголовок окна
        .document.title = title
        'Заполняем поле запроса в окне
        .lblPrompt.innerText = prompt
        'Двигаем окошко на нужные нам координаты (при желании можно отцентрировать по wnd.screenWidth / wnd.screenHeight)
        .moveTo 100, 100
        'Задаём ширину и высоту окошка
        .resizeTo 370, 170
    End With
    
    
    Do
        'Проверяем статус окна
        On Error Resume Next
        status = wnd.status
        'Если окошко закрыли кнопкой [X], то произойдёт ошибка обращения к нему
        If Err.number <> 0 Then 
            On Error Goto 0
            'В этом случае выходим из цикла
            Exit Do
        Else
            'Если же статус равен "1", то возвращаем из функции заполненное свойство и выходим из цикла
            if status = 1 Then 
                createInput = wnd.returnValue
                Exit Do
            End if
        End if
        WScript.Sleep 100
    Loop
    'По концу функции закрываем окно
    wnd.close
End Function

'Функция создания HTA окна
Function createWindow(content,features)
    Dim wid, we, sw, id, i, doc
    Randomize:wid = Clng(Rnd*100000)
    Set we = CreateObject("WScript.Shell").Exec("mshta about:""" & _
    "<script>moveTo(-1000,-1000);resizeTo(0,0);</script>" & _
    "<hta:application id=app " & features & " />" & _
    "<object id=" & wid & " style='display:none' classid='clsid:8856F961-340A-11D0-A96B-00C04FD705A2'>" & _
    "<param name=RegisterAsBrowser value=1>" & _
    "</object>""")
    With CreateObject("Shell.Application")
        For i=1 to 1000
            For Each sw in .Windows
                On Error Resume Next
                id = Clng(sw.id)
                On Error Goto 0
                if id = wid Then
                    Set doc = sw.container
                    doc.write CStr(content)
                    Set createWindow = doc.parentWindow
                    Exit Function
                End if
            Next
        Next
    End With
    we.Terminate
    Err.Raise vbObjectError,"createWindow","Can't connect with created window !"
End Function