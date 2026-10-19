# Nosso amor

App Android privado para celebrar a história de vocês. O conteúdo e as fotos ficam empacotados no app; o álbum, a cartinha, o contador e a música local continuam disponíveis sem internet. A playlist do Spotify precisa de internet.

## Gerar o APK no Windows

Instale o Android Studio 2025.2.1 ou mais recente e, no SDK Manager, instale o Android SDK Platform 36 e o Android SDK Build-Tools. Aceite as licenças do Android SDK no próprio Android Studio. O Android Studio fornece o JDK adequado. Depois, abra um terminal nesta pasta e execute:

```powershell
npm install
npm run android:add
npm run android:apk
```

O APK de depuração será criado em `android/app/build/outputs/apk/debug/app-debug.apk`.

Requisitos do build: Node.js 22 ou mais recente e Android Studio com o Android SDK. O Gradle Wrapper baixa a versão necessária no primeiro build. Para abrir o projeto no Android Studio, use `npm run android:open`.

## Instalar como app pelo navegador

Hospede a pasta em um endereço HTTPS e abra no Chrome do Android. Use **Instalar app** quando aparecer. O modo offline fica disponível depois que o app carrega uma vez. No APK nativo, o botão de lembrete agenda uma notificação mensal local; no navegador, o lembrete só pode ser exibido quando o app é aberto no dia.

## Recadinhos e fotos compartilhados entre dois celulares

As interações privadas precisam de internet, HTTPS e de um projeto Supabase; publicar apenas os arquivos no GitHub Pages não cria armazenamento nem sincronização. O site continua funcionando sem configurar essa integração, mas os recadinhos e uploads ficam desativados até a configuração ser concluída.

1. Crie um projeto no Supabase e abra **SQL Editor**.
2. Execute todo o conteúdo de [`supabase/setup.sql`](./supabase/setup.sql). Ele cria as tabelas, políticas privadas (RLS), bucket privado para fotos e canais em tempo real.
3. Publique o site por HTTPS e, em **Authentication → URL Configuration**, defina o endereço publicado como **Site URL** e como endereço de redirecionamento permitido.
4. No Supabase, abra **Project Settings → API** e copie o **Project URL** e a chave pública **anon** (nunca use `service_role`). Preencha esses dois valores em [`assets/js/couple-config.js`](./assets/js/couple-config.js).
5. Gere os arquivos web com `npm run prepare:web` e publique o conteúdo da pasta `www` no GitHub Pages.
6. Cada pessoa cria uma conta pela seção **nosso cantinho a dois** e confirma o e-mail. Depois, no **SQL Editor**, libere somente essas duas contas, substituindo os e-mails:

   ```sql
   insert into public.couple_members (user_id)
   select id from auth.users
   where email in ('SEU_EMAIL', 'EMAIL_DELA')
   on conflict (user_id) do nothing;
   ```

Depois de entrar, os recadinhos aparecem nos dois celulares em tempo real. Na página **momentos**, uma foto JPG, PNG ou WebP de até 10 MB é enviada para o bucket privado e aparece automaticamente no álbum compartilhado. Não publique a chave `service_role` nem remova as políticas de segurança do SQL.
