import { useState } from 'react';

type Scenario = 'bike' | 'social' | 'registry' | 'account';
type Tone = 'neutral' | 'stop' | 'wait' | 'ok';
type Kind = 'primary' | 'secondary' | 'link';
type Act = { label: string; to: string; kind: Kind; log?: string };
type Step = {
    status: string;
    tone: Tone;
    title: string;
    lead: string;
    event?: string;
    warning?: string;
    steps?: string[];
    timer?: { label: string; value: string; hint: string };
    quiz?: { questions: string[]; yesTo: string; noTo: string };
    actions: Act[];
    demo: string;
    final?: boolean;
};
type Flow = {
    title: string;
    amount: string;
    recipient: string;
    channel: string;
    start: string;
    card: { n: string; text: string; tag: string };
    steps: Record<string, Step>;
    staff: { signals: string[]; law: string };
};

const toHome: Act = { label: 'Вернуться к сценариям', to: '__home', kind: 'primary' };

const cancelled = (amount: string, demo: string, extra?: string[]): Step => ({
    status: 'Отменён', tone: 'neutral', title: 'Перевод отменён',
    lead: `${amount} остались на вашем счёте.`, event: 'Перевод отменён клиентом',
    steps: extra, actions: [toHome], demo, final: true
});

const flows: Record<Scenario, Flow> = {
    bike: {
        title: 'Покупка велосипеда', amount: '120 000 ₽', recipient: 'Алексей И. · новый получатель', channel: 'СБП · мобильный банк', start: 'form',
        card: { n: '01', text: 'Вчера сменил номер, сегодня платит новому продавцу. Операция законная.', tag: 'Сохранить удобство' },
        staff: {
            signals: ['Смена номера телефона менее 48 часов назад (признак 9)', 'Получатель ранее не встречался', 'Сумма выше привычной для профиля'],
            law: 'Первичный перевод через СБП не выполняется, клиент уведомляется о порядке повтора на те же реквизиты и сумму. Перед исполнением повтора получатель снова проверяется по базе Банка России.'
        },
        steps: {
            form: {
                status: 'Новый перевод', tone: 'neutral', title: 'Перевод по номеру телефона',
                lead: 'Проверьте получателя и сумму перед отправкой.',
                actions: [{ label: 'Перевести 120 000 ₽', to: 'refused', kind: 'primary', log: 'нажал «Перевести»' }],
                demo: 'Ситуация: вчера Никита сменил номер телефона в онлайн-банке, сегодня покупает велосипед у нового продавца. Смена номера менее чем за 48 часов до перевода — признак 9 из перечня Банка России.'
            },
            refused: {
                status: 'Не выполнен', tone: 'stop', title: 'Перевод не выполнен', event: '09:56 · Перевод не выполнен банком',
                lead: 'Вчера в профиле сменился номер телефона, поэтому перевод новому получателю мы сначала останавливаем. Деньги остались на вашем счёте.',
                warning: 'Если вы переводите по просьбе звонящего или чтобы «защитить» деньги — не повторяйте перевод и свяжитесь с банком.',
                actions: [
                    { label: 'Повторить тот же перевод', to: 'repeat', kind: 'primary', log: 'выбрал повтор' },
                    { label: 'Связаться с банком', to: 'help', kind: 'secondary', log: 'открыл чат с банком' },
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'link', log: 'отменил перевод' }
                ],
                demo: 'По 161-ФЗ банк отказывает в первичном переводе через СБП и сообщает, как повторить его. Сумма и получатель сохранены, звонить в поддержку не нужно.'
            },
            repeat: {
                status: 'Ожидает подтверждения', tone: 'wait', title: 'Подтвердите повтор',
                lead: 'Сумма и получатель те же, что в первом переводе. Изменить их нельзя — иначе это будет новый перевод.',
                actions: [
                    { label: 'Подтвердить в приложении', to: 'done', kind: 'primary', log: 'подтвердил повтор' },
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'secondary', log: 'отменил перевод' }
                ],
                demo: 'Перед исполнением банк заново проверяет получателя по базе Банка России и другие основания. Получателя в базе нет, поэтому отдельного ожидания не требуется.'
            },
            done: {
                status: 'Выполнен', tone: 'ok', title: 'Перевод выполнен', event: '09:57 · Повтор подтверждён, перевод выполнен',
                lead: '120 000 ₽ отправлены Алексею И. Доступ к онлайн-банку не ограничивался.',
                actions: [toHome], final: true,
                demo: 'Итог: законная покупка завершена без звонка в банк и визита в офис. Целевое время этого пути — до двух минут для 95% клиентов с учётом их действий.'
            },
            help: {
                status: 'Не выполнен', tone: 'stop', title: 'Чат с банком', event: '09:57 · Открыт чат с банком, обращение № 4815',
                lead: 'Специалист уже видит этот перевод: сумму, получателя и причину остановки. Пересказывать ничего не нужно.',
                steps: ['Специалист подскажет, как повторить перевод.', 'Банк никогда не попросит назвать код из SMS или пароль.'],
                actions: [
                    { label: 'Повторить тот же перевод', to: 'repeat', kind: 'primary', log: 'выбрал повтор' },
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'secondary', log: 'отменил перевод' }
                ],
                demo: 'Единый кейс: поддержка видит историю операции и законный следующий шаг, но не может отменить обязательные меры.'
            },
            cancelled: cancelled('120 000 ₽', 'Клиент в любой момент может отказаться от операции; деньги не списываются.')
        }
    },
    social: {
        title: '«Безопасный счёт»', amount: '240 000 ₽', recipient: 'Сергей В. · новый получатель', channel: 'СБП · мобильный банк', start: 'form',
        card: { n: '02', text: 'Клиент сам переводит деньги по указанию «службы безопасности».', tag: 'Распознать обман' },
        staff: {
            signals: ['Перевод себе 250 000 ₽ из другого банка через СБП 40 минут назад', 'Новый получатель, переводов за полгода не было (признак 11)', 'Возможное давление: клиент действует сам, аутентификация пройдена'],
            law: 'Признак 11 требует полной совокупности условий. После первичного отказа клиент может повторить перевод; при отсутствии иных оснований банк обязан его исполнить. Специалист не удерживает платёж бесконечно.'
        },
        steps: {
            form: {
                status: 'Новый перевод', tone: 'neutral', title: 'Перевод по номеру телефона',
                lead: 'Проверьте получателя и сумму перед отправкой.',
                actions: [{ label: 'Перевести 240 000 ₽', to: 'refused', kind: 'primary', log: 'нажал «Перевести»' }],
                demo: 'Ситуация: клиенту звонит «служба безопасности банка» и просит перевести сбережения на «безопасный счёт». 40 минут назад по указанию звонящего клиент перевёл себе 250 000 ₽ из другого банка через СБП.'
            },
            refused: {
                status: 'Не выполнен', tone: 'stop', title: 'Похоже на схему мошенников', event: '11:41 · Перевод не выполнен банком',
                lead: 'Вы только что перевели себе деньги из другого банка и сразу отправляете их человеку, которому раньше не переводили. Так действуют по указанию мошенников. Деньги остались на вашем счёте.',
                warning: '«Безопасного счёта» не существует. Банк, полиция и Центробанк никогда не просят переводить деньги, чтобы их сохранить. Если вам сейчас звонят — положите трубку.',
                actions: [
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'primary', log: 'отменил перевод' },
                    { label: 'Мне нужна помощь', to: 'help', kind: 'secondary', log: 'запросил помощь' },
                    { label: 'Это мой перевод', to: 'quiz', kind: 'link', log: 'выбрал «Это мой перевод»' }
                ],
                demo: 'Признак 11 из перечня Банка России: перевод себе из другого банка через СБП более 200 тыс. ₽, затем менее чем через 24 часа перевод физлицу без переводов за полгода. Проверка личности здесь не помогает — действует сам владелец.'
            },
            quiz: {
                status: 'Не выполнен', tone: 'stop', title: 'Ответьте на три вопроса',
                lead: 'Если кто-то подсказывает вам, что отвечать, — это мошенник.',
                quiz: {
                    questions: [
                        'Вам звонили или писали от имени банка, полиции, Центробанка или Госуслуг?',
                        'Вас торопят или просят никому не говорить о переводе?',
                        'Деньги нужно перевести, чтобы их «сохранить» или «проверить»?'
                    ], yesTo: 'scheme', noTo: 'repeat'
                },
                actions: [],
                demo: 'Вопросы ищут несоответствие между целью клиента и его действиями — главный сигнал давления по ответам организаторов. Ответ «нет» не снимает риск, но и не даёт банку права удерживать перевод бесконечно.'
            },
            scheme: {
                status: 'Не выполнен', tone: 'stop', title: 'Это мошенники', event: '11:43 · Клиент подтвердил признаки давления',
                lead: 'Именно так звучат сценарии телефонных мошенников. Положите трубку и не переводите деньги — мы поможем.',
                actions: [
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'primary', log: 'отменил перевод' },
                    { label: 'Связаться с банком', to: 'help', kind: 'secondary', log: 'запросил помощь' },
                    { label: 'Всё равно повторить перевод', to: 'repeat', kind: 'link', log: 'решил повторить вопреки предупреждению' }
                ],
                demo: 'Клиент получает прямой ответ вместо общей фразы. Повтор остаётся доступным: при отсутствии иных оснований банк обязан исполнить распоряжение, остаточный риск учтён в финансовой модели.'
            },
            repeat: {
                status: 'Ожидает подтверждения', tone: 'wait', title: 'Подтвердите повтор',
                lead: 'Вы повторяете перевод 240 000 ₽ Сергею В. Вернуть деньги после отправки может быть невозможно.',
                actions: [
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'primary', log: 'отменил перевод' },
                    { label: 'Подтвердить повтор', to: 'done', kind: 'secondary', log: 'подтвердил повтор' }
                ],
                demo: 'Безопасное действие — основная кнопка. Получатель не в базе Банка России, поэтому повтор по 161-ФЗ исполняется без обязательного ожидания.'
            },
            done: {
                status: 'Выполнен', tone: 'ok', title: 'Перевод выполнен', event: '11:45 · Повтор подтверждён, перевод выполнен',
                lead: '240 000 ₽ отправлены Сергею В. Если вы поняли, что это был обман, сообщите сразу: чем быстрее, тем выше шанс вернуть деньги.',
                actions: [
                    { label: 'Сообщить о мошенничестве', to: 'reported', kind: 'primary', log: 'сообщил о мошенничестве' },
                    { ...toHome, kind: 'secondary' }
                ],
                demo: 'Неуспех защиты показан честно: выявленный, но не предотвращённый перевод входит в ущерб финансовой модели.'
            },
            reported: {
                status: 'Выполнен · заявление № 7302', tone: 'wait', title: 'Заявление принято', event: 'Принято заявление о мошеннической операции',
                lead: 'Мы направили запрос в банк получателя. Специалист свяжется с вами в приложении.',
                actions: [toHome], final: true,
                demo: 'Обязательный сервис заявления о мошеннической операции в приложении (с октября 2025 года). Кейс получает подтверждённую метку для обучения модели.'
            },
            help: {
                status: 'Не выполнен', tone: 'stop', title: 'Банк на связи', event: 'Открыт чат с банком',
                lead: 'Сначала завершите разговор с тем, кто просит перевести деньги. Специалист банка напишет вам здесь, в приложении, — он уже видит этот перевод.',
                steps: ['Не сообщайте коды из SMS и пароли.', 'Не переходите по ссылкам и не устанавливайте приложения по просьбе собеседника.', 'Не звоните по номеру, который вам продиктовали.'],
                actions: [
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'primary', log: 'отменил перевод' },
                    { label: 'Назад к переводу', to: 'refused', kind: 'secondary' }
                ],
                demo: 'Скрипт специалиста: сначала убедиться, что клиент может говорить без подсказок, затем попросить своими словами объяснить, кому и зачем перевод.'
            },
            cancelled: cancelled('240 000 ₽', 'Клиент вышел из сценария обмана. Кейс закрывается как предотвращённая попытка.', ['Не сообщайте коды и пароли, даже если вам позвонят снова.', 'Если вы установили приложение по просьбе звонящего — удалите его и напишите в чат банка.'])
        }
    },
    registry: {
        title: 'Получатель в базе ЦБ', amount: '125 000 ₽', recipient: 'Иван Л. · новый получатель', channel: 'СБП · мобильный банк', start: 'form',
        card: { n: '03', text: 'Реквизиты получателя есть в базе Банка России. Действует обязательное ожидание.', tag: 'Соблюсти требования' },
        staff: {
            signals: ['Реквизиты получателя совпали с базой Банка России (признак 1)', 'Статус проверен перед обработкой операции'],
            law: 'Согласие клиента не отменяет период охлаждения. Для повтора по карте или СБП срок начинается в день повтора и заканчивается в конце следующего календарного дня. Оператор, биометрия и «Защита близких» его не сокращают.'
        },
        steps: {
            form: {
                status: 'Новый перевод', tone: 'neutral', title: 'Перевод по номеру телефона',
                lead: 'Проверьте получателя и сумму перед отправкой.',
                actions: [{ label: 'Перевести 125 000 ₽', to: 'refused', kind: 'primary', log: 'нажал «Перевести»' }],
                demo: 'Ситуация: реквизиты получателя есть в базе Банка России о случаях мошеннических переводов.'
            },
            refused: {
                status: 'Не выполнен', tone: 'stop', title: 'Получатель есть в базе Банка России', event: '2 ноября, 14:02 · Перевод не выполнен банком',
                lead: 'На эти реквизиты раньше поступали деньги, похищенные мошенниками. Мы не отправили 125 000 ₽ — они остались на вашем счёте.',
                warning: 'Если вы всё же повторите перевод, он будет выполнен только после обязательного ожидания. Сократить его не могут ни банк, ни вы.',
                actions: [
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'primary', log: 'отменил перевод' },
                    { label: 'Повторить перевод', to: 'repeat', kind: 'secondary', log: 'выбрал повтор' },
                    { label: 'Связаться с банком', to: 'help', kind: 'link', log: 'открыл чат с банком' }
                ],
                demo: 'Признак 1 из перечня Банка России. Безопасное действие — основная кнопка, но законный путь продолжения тоже виден.'
            },
            repeat: {
                status: 'Ожидает подтверждения', tone: 'wait', title: 'Повтор с ожиданием',
                lead: 'Перевод выполнится не сразу: ожидание закончится в конце завтрашнего дня, 3 ноября в 23:59. До этого момента его можно отменить.',
                actions: [
                    { label: 'Подтвердить повтор', to: 'waiting', kind: 'primary', log: 'подтвердил повтор' },
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'secondary', log: 'отменил перевод' }
                ],
                demo: 'Клиент заранее видит точный срок, а не универсальные «48 часов».'
            },
            waiting: {
                status: 'Ожидание до 23:59, 3 ноября', tone: 'wait', title: 'Перевод ждёт окончания срока', event: '2 ноября, 14:05 · Повтор подтверждён, началось ожидание',
                lead: 'Деньги пока на вашем счёте. Ускорить перевод нельзя, отменить можно в любой момент до окончания срока.',
                timer: { label: 'Будет выполнен после', value: '23:59, 3 ноября', hint: 'Повтор подтверждён 2 ноября в 14:05. Срок заканчивается в конце следующего календарного дня, выходные его не продлевают.' },
                actions: [
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'primary', log: 'отменил перевод во время ожидания' },
                    { label: 'Связаться с банком', to: 'help_wait', kind: 'secondary', log: 'открыл чат с банком' },
                    { label: 'Показать итог после срока (демо)', to: 'done', kind: 'link' }
                ],
                demo: 'Для повторной операции по карте или СБП срок начинается в день повтора и заканчивается в конце следующего календарного дня (кейс, с. 12; разъяснения Банка России). Кнопки «ускорить» нет ни у клиента, ни у оператора.'
            },
            help: {
                status: 'Не выполнен', tone: 'stop', title: 'Чат с банком', event: 'Открыт чат с банком',
                lead: 'Специалист объяснит основание и срок. Отменить обязательное ожидание он не может — это требование закона.',
                actions: [
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'primary', log: 'отменил перевод' },
                    { label: 'Назад к переводу', to: 'refused', kind: 'secondary' }
                ],
                demo: 'Поддержка видит основание и рассчитанный срок, поэтому даёт точный ответ вместо «попробуйте позже».'
            },
            help_wait: {
                status: 'Ожидание до 23:59, 3 ноября', tone: 'wait', title: 'Чат с банком', event: 'Открыт чат с банком',
                lead: 'Специалист объяснит основание и срок. Отменить обязательное ожидание он не может — это требование закона.',
                actions: [
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'primary', log: 'отменил перевод во время ожидания' },
                    { label: 'Назад к статусу', to: 'waiting', kind: 'secondary' }
                ],
                demo: 'Поддержка видит основание и рассчитанный срок, поэтому даёт точный ответ вместо «попробуйте позже».'
            },
            done: {
                status: 'Выполнен', tone: 'ok', title: 'Перевод выполнен', event: '4 ноября, 00:00 · Срок истёк, перевод выполнен',
                lead: '125 000 ₽ отправлены Ивану Л. после обязательного ожидания.',
                actions: [toHome], final: true,
                demo: 'Клиент, сознательно выбравший перевод, получает понятный срок и итог вместо неопределённого ожидания.'
            },
            cancelled: cancelled('125 000 ₽', 'Отказ от перевода получателю из базы ЦБ — лучший исход для клиента.')
        }
    },
    account: {
        title: 'Захват аккаунта', amount: '85 000 ₽', recipient: 'Олег Т. · новый получатель', channel: 'ДБО · новая сессия', start: 'alert',
        card: { n: '04', text: 'Вход с нового устройства и сразу перевод. Владелец получает уведомление.', tag: 'Защитить доступ' },
        staff: {
            signals: ['Вход с ранее неизвестного устройства', 'Перевод новому получателю через 4 минуты после входа', 'Факторы риска на устройстве (признак 10)'],
            law: 'Новое устройство само по себе не доказывает захват. Подтверждение — только по каналу, устойчивому к перехвату. При компрометации кейс передаётся в ИБ.'
        },
        steps: {
            alert: {
                status: 'Остановлен', tone: 'stop', title: 'Это вы переводите 85 000 ₽?', event: '10:18 · Перевод остановлен, уведомление на основное устройство',
                lead: 'Сегодня в 10:14 в ваш онлайн-банк вошли с нового устройства (Android, Казань), а через 4 минуты начали перевод новому получателю. Мы остановили перевод — деньги на счёте.',
                actions: [
                    { label: 'Это не я — защитить доступ', to: 'secured', kind: 'primary', log: 'ответил «Это не я»' },
                    { label: 'Это я', to: 'verify', kind: 'secondary', log: 'ответил «Это я»' },
                    { label: 'Связаться с банком', to: 'help', kind: 'link', log: 'открыл чат с банком' }
                ],
                demo: 'Ситуация: злоумышленник получил доступ к онлайн-банку. Уведомление приходит на привычное устройство владельца, а не на новое. Решение принимается по совокупности сигналов: устройство, сессия, получатель, время.'
            },
            verify: {
                status: 'Ожидает подтверждения', tone: 'wait', title: 'Подтвердите, что это вы',
                lead: 'Подтвердите перевод на устройстве, которым пользуетесь обычно, или в отделении. Код из SMS не подойдёт: если номер подменили, его получит злоумышленник.',
                actions: [
                    { label: 'Подтвердить на основном устройстве', to: 'done', kind: 'primary', log: 'подтвердил на основном устройстве' },
                    { label: 'Отменить перевод', to: 'cancelled', kind: 'secondary', log: 'отменил перевод' }
                ],
                demo: 'Одноразовый код можно перехватить или выманить, поэтому для этого случая нужен канал, устойчивый к перехвату.'
            },
            done: {
                status: 'Выполнен', tone: 'ok', title: 'Перевод выполнен', event: 'Владелец подтвердил, перевод выполнен',
                lead: '85 000 ₽ отправлены Олегу Т. Новое устройство добавлено в список ваших устройств.',
                actions: [toHome], final: true,
                demo: 'Легитимная смена телефона не превращается в блокировку онлайн-банка: это одна из главных причин ложных срабатываний по ответам организаторов.'
            },
            secured: {
                status: 'Отменён', tone: 'neutral', title: 'Доступ защищён', event: 'Перевод отменён, сеанс на новом устройстве завершён',
                lead: 'Перевод отменён, сеанс на новом устройстве завершён. 85 000 ₽ на вашем счёте.',
                steps: ['Смените пароль от онлайн-банка.', 'Проверьте номер телефона и почту в профиле.', 'Если вы кому-то сообщали коды — напишите в чат банка.'],
                actions: [toHome], final: true,
                demo: 'Кейс передаётся в ИБ: проверка сессий, устройств и способа компрометации. Онлайн-банк остаётся доступен владельцу с основного устройства.'
            },
            help: {
                status: 'Остановлен', tone: 'stop', title: 'Чат с банком', event: 'Открыт чат с банком',
                lead: 'Специалист видит попытку входа и перевод. Он поможет проверить, все ли устройства в профиле ваши.',
                actions: [
                    { label: 'Защитить доступ', to: 'secured', kind: 'primary', log: 'ответил «Это не я»' },
                    { label: 'Назад', to: 'alert', kind: 'secondary' }
                ],
                demo: 'Поддержка не просит коды и не подтверждает операцию за клиента.'
            },
            cancelled: cancelled('85 000 ₽', 'Владелец отказался от операции; сессия остаётся под наблюдением.')
        }
    }
};

type StaffStatus = 'Новый' | 'В работе' | 'Ожидает клиента' | 'Передан старшему' | 'Передан в ИБ' | 'Передан в поддержку' | 'Закрыт';
type Investigation = 'Мошенничество подтверждено' | 'Легитимная операция' | 'Недостаточно данных';
type StaffCase = { id: string; scenario: Scenario; client: string; time: string; status: StaffStatus; summary: string; events: string[]; outcome?: Investigation };
type Transfer = { status: StaffStatus; label: string; to: string; note: string };

const transfers: Transfer[] = [
    { status: 'Передан старшему', label: 'Старшему антифроду', to: 'старшему специалисту антифрода', note: 'Сложный случай или спорный исход.' },
    { status: 'Передан в ИБ', label: 'В ИБ', to: 'в службу информационной безопасности', note: 'Признаки компрометации доступа или устройства.' },
    { status: 'Передан в поддержку', label: 'В поддержку', to: 'в клиентскую поддержку', note: 'Нужно объяснить клиенту статус и следующий шаг.' }
];

const initialStaffCases: StaffCase[] = [
    { id: 'AF-260184', scenario: 'social', client: 'Никита С.', time: 'Сегодня, 11:41', status: 'Новый', summary: 'Перевод 240 000 ₽ новому получателю после перевода себе из другого банка.', events: ['11:01 · Входящий перевод себе 250 000 ₽ через СБП', '11:40 · Добавлен новый получатель', '11:41 · Признак 11, первичный отказ, создан кейс'] },
    { id: 'AF-260183', scenario: 'account', client: 'Мария К.', time: 'Сегодня, 10:18', status: 'В работе', summary: 'Вход с нового устройства и перевод 85 000 ₽ через 4 минуты.', events: ['10:14 · Вход с нового устройства', '10:18 · Попытка перевода 85 000 ₽', '10:18 · Перевод остановлен, уведомление на основное устройство'] },
    { id: 'AF-260179', scenario: 'bike', client: 'Никита С.', time: 'Сегодня, 09:56', status: 'Ожидает клиента', summary: 'Смена номера менее 48 часов назад, перевод 120 000 ₽.', events: ['Вчера · Изменён номер телефона', '09:56 · Первичный перевод не выполнен', '09:56 · Клиенту показан порядок повтора'] },
    { id: 'AF-260171', scenario: 'registry', client: 'Иван П.', time: 'Сегодня, 09:21', status: 'Передан старшему', summary: 'Получатель в базе Банка России, перевод 125 000 ₽.', events: ['09:20 · Создано распоряжение на 125 000 ₽', '09:21 · Совпадение с базой Банка России', '09:21 · Применена обязательная процедура'] }
];
const caseIdByScenario: Record<Scenario, string> = { social: 'AF-260184', account: 'AF-260183', bike: 'AF-260179', registry: 'AF-260171' };
const now = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

function StaffDashboard({ onToast, onOpenClient, clientEvents }: { onToast: (s: string) => void; onOpenClient: (s: Scenario) => void; clientEvents: Record<string, string[]> }) {
    const [items, setItems] = useState(initialStaffCases), [selected, setSelected] = useState('AF-260184');
    const [filter, setFilter] = useState('Все'), [sort, setSort] = useState('Сначала новые');
    const [notes, setNotes] = useState<Record<string, string>>({}), [audit, setAudit] = useState<Record<string, string[]>>({});
    const [pendingClose, setPendingClose] = useState(false), [outcome, setOutcome] = useState(''), [transfer, setTransfer] = useState<Transfer | null>(null);
    const current = items.find(x => x.id === selected) ?? items[0];
    const flow = flows[current.scenario];
    const visible = items.filter(x => filter === 'Все' || (filter === 'Новые' ? x.status === 'Новый' : filter === 'Ожидают клиента' ? x.status === 'Ожидает клиента' : x.status === 'Закрыт'))
        .sort((a, b) => sort === 'Сначала новые' ? b.time.localeCompare(a.time) : a.time.localeCompare(b.time));
    const log = (msg: string) => setAudit(p => ({ ...p, [selected]: [`${now()} · ${msg}`, ...(p[selected] ?? [])] }));
    const update = (status: StaffStatus, msg: string) => { setItems(p => p.map(x => x.id === selected ? { ...x, status } : x)); log(msg); onToast(`Действие записано в журнале ${selected}.`); };
    const closeCase = () => {
        if (!outcome) return;
        setItems(p => p.map(x => x.id === selected ? { ...x, status: 'Закрыт', outcome: outcome as Investigation } : x));
        log(`Кейс закрыт. Итог: ${outcome}.`); setPendingClose(false); setOutcome(''); onToast(`Кейс ${selected} закрыт с классификацией результата.`);
    };
    const closed = current.status === 'Закрыт';
    const events = [...current.events, ...(clientEvents[current.id] ?? [])];
    return <div className="staff-workspace">
        <div className="staff-heading"><div><div className="eyebrow">ВНУТРЕННИЙ ИНТЕРФЕЙС · ДЕМО</div><h1>Рабочее место антифрода</h1><p>Очередь инцидентов, контекст операции и контроль следующих действий.</p></div><div className="staff-operator"><div className="operator-avatar">А</div><div><b>Анна Петрова</b><small>Специалист антифрода · демонстрация</small></div></div></div>
        <div className="staff-kpis">
            <div><small>Открытые кейсы</small><b>{items.filter(x => x.status !== 'Закрыт').length}</b><span>В текущей очереди</span></div>
            <div><small>Новые кейсы</small><b>{items.filter(x => x.status === 'Новый').length}</b><span>Ожидают первичной обработки</span></div>
            <div><small>Ожидают клиента</small><b>{items.filter(x => x.status === 'Ожидает клиента').length}</b><span>Следующий шаг — за клиентом</span></div>
            <div><small>Закрытые с результатом</small><b>{items.filter(x => x.status === 'Закрыт' && x.outcome).length}</b><span>Есть итог расследования</span></div></div>
        <div className="staff-grid">
            <section className="staff-queue"><div className="staff-panel-head"><div><h2>Очередь инцидентов</h2><p>Демонстрационные записи · фильтр и сортировка</p></div><span className="queue-count">{visible.length} кейса</span></div>
                <div className="staff-filters">{['Все', 'Новые', 'Ожидают клиента', 'Закрытые'].map(f => <button key={f} className={filter === f ? 'chosen' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>
                <label className="sort-control">Сортировать <select value={sort} onChange={e => setSort(e.target.value)}><option>Сначала новые</option><option>Сначала старые</option></select></label>
                <div className="case-list">{visible.map(item => <button key={item.id} className={`case-row ${selected === item.id ? 'selected' : ''}`} onClick={() => { setSelected(item.id); setPendingClose(false); setTransfer(null); }}>
                    <div className="case-row-top"><b>{item.id}</b></div><strong>{flows[item.scenario].title}</strong><p>{item.summary}</p><div className="case-meta"><span>{item.client}</span><span>{item.time}</span></div><span className="status-chip">{item.status}</span>{item.outcome && <span className="outcome-chip">{item.outcome}</span>}</button>)}</div></section>
            <section className="staff-detail">
                <div className="staff-panel-head"><div><div className="eyebrow">КАРТОЧКА ИНЦИДЕНТА</div><h2>{current.id}</h2><p>{flow.channel} · {current.time}</p></div></div>
                <div className="staff-client"><div className="client-avatar">{current.client[0]}</div><div><b>{current.client}</b><small>Физическое лицо · демонстрационный профиль</small></div><span className="status-chip">{current.status}</span></div>
                <div className="staff-amount"><div><small>Сумма операции</small><b>{flow.amount}</b></div><div><small>Получатель</small><b>{flow.recipient}</b></div></div>
                <div className="staff-section"><h3>Контекст и сигналы</h3><ul>{flow.staff.signals.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                <div className="freshness-grid"><div className="freshness live"><div><b>Критичные статусы</b><small>Проверяются в актуальном источнике перед исполнением</small></div><em>Онлайн-запрос</em></div><div className="freshness delayed"><div><b>Исторические признаки</b><small>Часть истории поступает с задержкой до 24 часов</small></div><em>Возможна задержка</em></div></div>
                <div className="staff-section"><h3>Хронология</h3><div className="timeline">{events.map((e, i) => <div className="timeline-item" key={i}><span>{e}</span></div>)}</div></div>
                <div className="staff-section"><h3>Правовые и процессные ограничения</h3><div className="staff-legal"><b>Оператор не может отменить обязательную процедуру</b><p>{flow.staff.law}</p></div></div>
                <div className="staff-section"><h3>Связанный клиентский сценарий</h3><p className="action-hint">Откройте клиентский экран этого же кейса. Действия клиента попадут в хронологию инцидента.</p><button className="secondary" onClick={() => onOpenClient(current.scenario)}>Открыть сценарий клиента</button></div>
                <div className="staff-section"><h3>Действия специалиста</h3><p className="action-hint">Действия меняют только демонстрационный статус. Они не выполняют банковских операций и не снимают обязательные ограничения.</p>
                    <div className="staff-actions">
                        <button className="primary" disabled={closed} onClick={() => update('В работе', 'Кейс взят в работу')}>Взять в работу</button>
                        <button className="secondary" disabled={closed} onClick={() => update('Ожидает клиента', 'Запрошен контакт по защищённому каналу')}>Запросить контакт клиента</button>
                        <button className="outline-danger" disabled={closed} onClick={() => { setPendingClose(true); setOutcome(''); setTransfer(null); }}>Закрыть кейс после проверки</button>
                    </div>
                    <div className="handoff"><b>Передать кейс</b><div className="handoff-row">{transfers.map(t => <button key={t.status} className="secondary" disabled={closed} onClick={() => { setTransfer(t); setPendingClose(false); }}>{t.label}</button>)}</div></div>
                    {transfer && <div className="inline-confirm"><b>Передать {current.id} {transfer.to}?</b><p>{transfer.note} История кейса передаётся целиком, обязательные процедуры не меняются.</p><button className="primary" onClick={() => { update(transfer.status, `${transfer.status}`); setTransfer(null); }}>Подтвердить передачу</button> <button className="secondary" onClick={() => setTransfer(null)}>Отмена</button></div>}
                    {pendingClose && <div className="close-form"><b>Результат расследования</b><p>Выберите итог перед закрытием кейса. Неизвестный исход не записывается как легитимная операция.</p>{(['Мошенничество подтверждено', 'Легитимная операция', 'Недостаточно данных'] as Investigation[]).map(v => <label className="outcome-option" key={v}><input type="radio" name="investigation" checked={outcome === v} onChange={() => setOutcome(v)} />{v}</label>)}<button className="primary" disabled={!outcome} onClick={closeCase}>Зафиксировать результат и закрыть</button><button className="secondary" onClick={() => setPendingClose(false)}>Не закрывать</button></div>}
                    <label className="note-label">Внутренняя заметка (демо)<textarea value={notes[selected] ?? ''} onChange={e => setNotes(p => ({ ...p, [selected]: e.target.value }))} placeholder="Например: запросить подтверждение по защищённому каналу..." /></label>
                    <button className="secondary save-note" onClick={() => { const v = (notes[selected] ?? '').trim(); if (v) { log(`Заметка: ${v}`); setNotes(p => ({ ...p, [selected]: '' })); onToast('Заметка добавлена в журнал кейса.'); } }}>Добавить заметку в журнал</button></div>
                {(audit[selected] ?? []).length > 0 && <div className="staff-section"><h3>Журнал действий</h3><div className="audit-list">{(audit[selected] ?? []).map((a, i) => <p key={i}>{a}</p>)}</div></div>}
            </section></div>
        <div className="staff-footnote"><b>Важно:</b> демонстрационный макет. Данные и статусы вымышлены; интеграции с АБС, CRM, антифродом и клиентскими каналами нет. Решение специалиста не отменяет обязательные процедуры.</div>
    </div>;
}

function Quiz({ quiz, onDone }: { quiz: NonNullable<Step['quiz']>; onDone: (anyYes: boolean, answers: boolean[]) => void }) {
    const [answers, setAnswers] = useState<(boolean | null)[]>(quiz.questions.map(() => null));
    const ready = answers.every(a => a !== null);
    return <div className="quiz">
        {quiz.questions.map((q, i) => <div className="quiz-q" key={i}><p>{q}</p><div className="quiz-opts">
            {[true, false].map(v => <button key={String(v)} className={answers[i] === v ? 'on' : ''} onClick={() => setAnswers(p => p.map((a, j) => j === i ? v : a))}>{v ? 'Да' : 'Нет'}</button>)}
        </div></div>)}
        <button className="primary full quiz-submit" disabled={!ready} onClick={() => onDone(answers.some(a => a), answers as boolean[])}>Продолжить</button>
    </div>;
}

function ClientFlow({ scenario, stepId, history, go, onHome }: { scenario: Scenario; stepId: string; history: string[]; go: (to: string, log?: string, event?: string) => void; onHome: () => void }) {
    const flow = flows[scenario];
    const step = flow.steps[stepId];
    const run = (a: Act) => a.to === '__home' ? onHome() : go(a.to, a.log);
    return <>
        <div className="page-head"><div><div className="eyebrow">{flow.title.toUpperCase()}</div><h1>{step.final ? 'Итог операции' : 'Перевод физическому лицу'}</h1></div><button className="back" onClick={onHome}>К сценариям</button></div>
        <div className="check-grid">
            <section className="panel op-panel">
                <div className="panel-title"><div><h2>Операция</h2><p>{flow.channel}</p></div><span className={`status-pill tone-${step.tone}`}>{step.status}</span></div>
                <div className="recipient"><div className="recipient-avatar">{flow.recipient[0]}</div><div><small>Получатель</small><b>{flow.recipient}</b></div></div>
                <div className="amount-box"><small>Сумма</small><strong>{flow.amount}</strong><span>Сумма и получатель сохраняются на всех шагах</span></div>
                {history.length > 0 && <div className="op-history"><b>История операции</b><ol>{history.map((h, i) => <li key={i}>{h}</li>)}</ol></div>}
            </section>
            <section className="decision">
                <h2>{step.title}</h2>
                <p className="lead">{step.lead}</p>
                {step.warning && <div className="client-warning">{step.warning}</div>}
                {step.timer && <div className="timer-box"><small>{step.timer.label}</small><strong>{step.timer.value}</strong><p>{step.timer.hint}</p></div>}
                {step.steps && <ol className="client-steps">{step.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
                {step.quiz && <Quiz key={stepId} quiz={step.quiz} onDone={(yes, ans) => go(yes ? step.quiz!.yesTo : step.quiz!.noTo, `ответил на вопросы: ${ans.map(a => a ? 'да' : 'нет').join(' / ')}`)} />}
                {step.actions.length > 0 && <div className="decision-actions">{step.actions.map(a => a.kind === 'link'
                    ? <button key={a.label} className="link-btn" onClick={() => run(a)}>{a.label}</button>
                    : <button key={a.label} className={`${a.kind} full`} onClick={() => run(a)}>{a.label}</button>)}</div>}
            </section>
        </div>
        <div className="demo-note"><b>Пояснение к шагу · не видно клиенту</b><p>{step.demo}</p></div>
    </>;
}

export default function App() {
    const [scenario, setScenario] = useState<Scenario>('bike');
    const [stepId, setStepId] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [toast, setToast] = useState(''), [staffMode, setStaffMode] = useState(false);
    const [clientEvents, setClientEvents] = useState<Record<string, string[]>>({});

    const enter = (s: Scenario, id: string, prev: string[]) => {
        const st = flows[s].steps[id];
        setStepId(id);
        setHistory(st.event && !prev.includes(st.event) ? [...prev, st.event] : prev);
    };
    const start = (s: Scenario) => { setScenario(s); setToast(''); setStaffMode(false); enter(s, flows[s].start, []); };
    const go = (to: string, log?: string) => {
        if (log) { const id = caseIdByScenario[scenario]; setClientEvents(p => ({ ...p, [id]: [`${now()} · Клиент ${log}`, ...(p[id] ?? [])] })); }
        enter(scenario, to, history);
    };
    const clientName = stepId === null ? 'Никита С.' : initialStaffCases.find(c => c.scenario === scenario)!.client;
    const home = () => { setStaffMode(false); setStepId(null); setHistory([]); setToast(''); };

    return <div className="shell"><header className="topbar"><div className="brand"><b>ВТБ</b><small>КОНТЕКСТ</small></div><div className="top-actions"><button className="mode-switch" onClick={() => setStaffMode(!staffMode)}>{staffMode ? 'Кабинет клиента' : 'Кабинет сотрудника'}</button><span className="demo">ДЕМО-РЕЖИМ</span><div className="user">{staffMode ? 'А' : clientName[0]}</div></div></header><div className="body">
        <aside className="sidebar"><div className="person"><div className="person-avatar">{staffMode ? 'А' : clientName[0]}</div><div><b>{staffMode ? 'Анна Петрова' : clientName}</b><small>{staffMode ? 'Специалист антифрода' : 'Демонстрационный профиль'}</small></div></div><div className="nav-caption">МЕНЮ</div>
            <button className={'nav ' + (!staffMode && stepId === null ? 'selected' : '')} onClick={home}><span>Обзор</span></button>
            <button className={'nav ' + (!staffMode && stepId !== null ? 'selected' : '')} onClick={home}><span>Переводы</span></button>
            <button className="nav" onClick={() => setToast('История операций — демонстрационный раздел.')}><span>История операций</span></button>
            <button className="nav" onClick={() => setToast('Настройки не подключены в демо-прототипе.')}><span>Настройки</span></button>
            <div className="side-foot">Changellenge Cup Moscow 2026</div></aside>
        <main className="main"><div className="crumb">ВТБ Онлайн <span>/</span> {staffMode ? 'Рабочее место антифрода' : stepId === null ? 'Обзор' : 'Перевод'}</div>
            {toast && <div className="toast">{toast}<button onClick={() => setToast('')} aria-label="Закрыть уведомление">Закрыть</button></div>}
            <div style={{ display: staffMode ? 'block' : 'none' }}><StaffDashboard onToast={setToast} onOpenClient={start} clientEvents={clientEvents} /></div>
            <div style={{ display: staffMode ? 'none' : 'block' }}>
                {stepId === null && <>
                    <section className="hero"><div><div className="eyebrow">БЕЗОПАСНОСТЬ И УДОБСТВО</div><h1>Деньги под защитой</h1><p>Четыре ситуации: от законной покупки до перевода под давлением мошенника. В каждой клиент видит причину, допустимые действия и итог операции.</p><button className="primary" onClick={() => start('bike')}>Начать с первого сценария</button></div><div className="hero-visual"><div className="visual-card"><span>ВТБ</span><strong>Защита<br />переводов</strong><small>КОНТЕКСТНЫЙ АНТИФРОД</small></div></div></section>
                    <div className="section-head"><div><h2>Сценарии</h2><p>Выберите ситуацию. Пояснения под экранами видны только в демо.</p></div><span>4 сценария</span></div>
                    <section className="scenario-grid">{(Object.keys(flows) as Scenario[]).map(s => <button key={s} className="scenario-card" onClick={() => start(s)}><div className="card-kicker">Сценарий {flows[s].card.n}</div><h3>{flows[s].title}</h3><p>{flows[s].card.text}</p><span className="tag">{flows[s].card.tag}</span></button>)}</section>
                    <div className="bottom-note"><section><b>Не каждое необычное действие — мошенничество</b><p>Обязательные меры по 161-ФЗ сохраняются; ВТБ Контекст выбирает понятное продолжение для клиента в их пределах.</p></section></div>
                </>}
                {stepId !== null && <ClientFlow scenario={scenario} stepId={stepId} history={history} go={go} onHome={home} />}
            </div>
            <footer className="footer"><span>ВТБ Контекст · версия 7.0</span><span>Не является банковским сервисом · данные вымышлены</span></footer></main></div></div>;
}
