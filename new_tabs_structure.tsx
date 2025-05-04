{/* Боковая панель: список участников или чат */}
{(showParticipantsList || showChat) && (
  <div className={`${isMobile ? 'w-full' : 'w-80'} border-l bg-card flex flex-col h-full`}>
    <Tabs defaultValue={showChat ? 'chat' : 'participants'} value={showChat ? 'chat' : 'participants'}>
      <div className="p-3 border-b">
        <TabsList className="w-full">
          <TabsTrigger 
            value="participants" 
            className="flex-1"
            onClick={handleParticipantsTabClick}
          >
            Участники ({participants.length + 1})
          </TabsTrigger>
          <TabsTrigger 
            value="chat" 
            className="flex-1"
            onClick={handleChatTabClick}
          >
            Чат {chatMessages.length > 0 && <span className="ml-1 text-xs">({chatMessages.length})</span>}
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Вкладка участников */}
      <TabsContent value="participants" className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Вы</h3>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{user?.name?.charAt(0) || 'U'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user?.name || 'Вы'}</p>
                  <p className="text-xs text-muted-foreground">
                    {isUserAdmin ? 'Администратор' : (isLocalHost ? 'Хост' : 'Участник')}
                    {isLocalHost && (
                      <span className="ml-2 text-indigo-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L7.5 6 2 2h20l-5.5 4-4.5-4z"/>
                          <path d="M8 2l4 10 4-10"/>
                          <path d="M22 22H2L12 2l10 20z"/>
                        </svg>
                        Хост
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            {participants.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Другие участники</h3>
                {participants.map(participant => (
                  <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">{participant.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{participant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {participant.isAdmin ? 'Администратор' : (participant.isHost ? 'Хост' : 'Участник')}
                        {participant.isHost && (
                          <span className="ml-2 text-indigo-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2L7.5 6 2 2h20l-5.5 4-4.5-4z"/>
                              <path d="M8 2l4 10 4-10"/>
                              <path d="M22 22H2L12 2l10 20z"/>
                            </svg>
                            Хост
                          </span>
                        )}
                        {raisedHands.includes(participant.id) && (
                          <span className="ml-2 text-amber-500">Поднял руку</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!participant.audioEnabled && (
                        <span className="p-1 rounded-full bg-red-500/10" title="Микрофон выключен">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                          </svg>
                        </span>
                      )}
                      {!participant.videoEnabled && (
                        <span className="p-1 rounded-full bg-red-500/10" title="Камера выключена">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t space-y-2">
          {!localParticipant.isHost && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={toggleHand}
            >
              {isHandRaised ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path>
                    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path>
                    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path>
                    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path>
                  </svg>
                  Опустить руку
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path>
                    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path>
                    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path>
                    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path>
                  </svg>
                  Поднять руку
                </>
              )}
            </Button>
          )}
          
          {/* Элементы управления для хоста */}
          {localParticipant.isHost && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950 border border-indigo-200 dark:border-indigo-800 rounded-md p-3 shadow-sm">
                <h4 className="text-base font-semibold text-indigo-800 dark:text-indigo-200 mb-3 flex items-center bg-white/40 dark:bg-indigo-900/50 py-1 px-2 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L7.5 6 2 2h20l-5.5 4-4.5-4z"/>
                    <path d="M22 22H2L12 2l10 20z"/>
                  </svg>
                  Панель управления хоста
                </h4>
                <div className="space-y-3 divide-y divide-indigo-200 dark:divide-indigo-800">
                  <div className="flex items-center pb-2">
                    <Switch
                      id="host-video-priority"
                      checked={hostSettings.hostVideoPriority}
                      onCheckedChange={(checked) => {
                        // Обновляем настройки через WebRTCContext
                        updateHostSettings({ hostVideoPriority: checked });
                        
                        // Обновляем настройки на сервере
                        if (conference?.id) {
                          fetch(`/api/conferences/${conference.id}/host-settings`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ hostVideoPriority: checked }),
                          }).then(res => {
                            if (!res.ok) {
                              toast({
                                title: "Ошибка обновления настроек",
                                description: "Не удалось сохранить настройки на сервере",
                                variant: "destructive"
                              });
                            }
                          }).catch(error => {
                            console.error('Ошибка при обновлении настроек:', error);
                            toast({
                              title: "Ошибка соединения",
                              description: "Проверьте подключение к интернету",
                              variant: "destructive"
                            });
                          });
                        }
                      }}
                    />
                    <Label htmlFor="host-video-priority" className="ml-3 text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      Приоритет видео хоста
                      <span className="block text-xs text-indigo-700 dark:text-indigo-300 font-normal mt-0.5">
                        Видео хоста будет отображаться крупнее
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center py-2">
                    <Switch
                      id="allow-participant-detach"
                      checked={hostSettings.allowParticipantDetach}
                      onCheckedChange={(checked) => {
                        // Обновляем настройки через WebRTCContext
                        updateHostSettings({ allowParticipantDetach: checked });
                        
                        // Обновляем настройки на сервере
                        if (conference?.id) {
                          fetch(`/api/conferences/${conference.id}/host-settings`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ allowParticipantDetach: checked }),
                          }).then(res => {
                            if (!res.ok) {
                              toast({
                                title: "Ошибка обновления настроек",
                                description: "Не удалось сохранить настройки на сервере",
                                variant: "destructive"
                              });
                            }
                          }).catch(error => {
                            console.error('Ошибка при обновлении настроек:', error);
                            toast({
                              title: "Ошибка соединения",
                              description: "Проверьте подключение к интернету",
                              variant: "destructive"
                            });
                          });
                        }
                      }}
                    />
                    <Label htmlFor="allow-participant-detach" className="ml-3 text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      Разрешить отцеплять видео
                      <span className="block text-xs text-indigo-700 dark:text-indigo-300 font-normal mt-0.5">
                        Участники смогут перемещать видео по экрану
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center pt-2">
                    <Switch
                      id="mute-all-participants"
                      defaultChecked={false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Получить всех участников и отключить их микрофоны
                          participants.forEach(participant => {
                            if (participant.audioEnabled) {
                              muteParticipant(participant.id);
                            }
                          });
                          
                          toast({
                            title: "Микрофоны выключены",
                            description: "Микрофоны всех участников были отключены",
                          });
                          
                          // Автоматически выключаем переключатель после действия
                          setTimeout(() => {
                            const switchElem = document.getElementById('mute-all-participants') as HTMLInputElement;
                            if (switchElem) switchElem.checked = false;
                          }, 500);
                        }
                      }}
                    />
                    <Label htmlFor="mute-all-participants" className="ml-3 text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      Отключить микрофоны всех
                      <span className="block text-xs text-indigo-700 dark:text-indigo-300 font-normal mt-0.5">
                        Мгновенно выключаются все микрофоны
                      </span>
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-900 rounded-md shadow-sm">
                <div className="flex items-center mb-3">
                  <Switch
                    id="lock-conference"
                    checked={conference.isLocked}
                    onCheckedChange={(checked) => {
                      if (conference?.id) {
                        fetch(`/api/conferences/${conference.id}/lock`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ isLocked: checked }),
                        }).then(res => {
                          if (!res.ok) {
                            toast({
                              title: "Ошибка изменения блокировки",
                              description: "Не удалось изменить состояние блокировки",
                              variant: "destructive"
                            });
                          } else {
                            toast({
                              title: checked ? "Конференция заблокирована" : "Конференция разблокирована",
                              description: checked ? 
                                "Новые участники не смогут присоединиться" : 
                                "Новые участники теперь могут присоединиться",
                            });
                          }
                        }).catch(error => {
                          console.error('Ошибка при изменении блокировки:', error);
                          toast({
                            title: "Ошибка соединения",
                            description: "Проверьте подключение к интернету",
                            variant: "destructive"
                          });
                        });
                      }
                    }}
                  />
                  <Label htmlFor="lock-conference" className="ml-3 text-sm font-medium">
                    Блокировка конференции
                    <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                      Запретить новым участникам присоединяться
                    </span>
                  </Label>
                </div>
                
                <Button 
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const answer = confirm("Вы действительно хотите завершить конференцию для всех участников?");
                    if (answer) {
                      if (conference?.id) {
                        fetch(`/api/conferences/${conference.id}/terminate`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          }
                        }).then(res => {
                          if (!res.ok) {
                            toast({
                              title: "Ошибка завершения конференции",
                              description: "Не удалось завершить конференцию",
                              variant: "destructive"
                            });
                          } else {
                            toast({
                              title: "Конференция завершена",
                              description: "Конференция была успешно завершена",
                            });
                            onLeave();
                          }
                        }).catch(error => {
                          console.error('Ошибка при завершении конференции:', error);
                          toast({
                            title: "Ошибка соединения",
                            description: "Проверьте подключение к интернету",
                            variant: "destructive"
                          });
                        });
                      }
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                  <span className="font-medium">Завершить конференцию</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Вкладка чата */}
      <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">Нет сообщений в чате</p>
                <p className="text-xs text-muted-foreground">Будьте первым, кто напишет!</p>
              </div>
            ) : (
              chatMessages.map(message => {
                const isYou = message.senderId === 'local';
                return (
                  <div key={message.id} className={`flex flex-col ${isYou ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isYou 
                        ? 'bg-primary text-primary-foreground rounded-br-none' 
                        : 'bg-muted rounded-bl-none'
                    }`}>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-medium text-xs">
                          {isYou ? 'Вы' : message.senderName}
                        </span>
                        {message.isAdmin && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary-foreground/80">
                            Админ
                          </span>
                        )}
                      </div>
                      <p className="break-words">{message.text}</p>
                      <span className="text-[10px] opacity-70 block text-right mt-1">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Напишите сообщение..."
              className="flex-1 p-2 text-sm bg-muted rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button type="submit" size="sm" disabled={!chatMessage.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </Button>
          </form>
        </div>
      </TabsContent>
    </Tabs>
  </div>
)}