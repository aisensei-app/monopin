import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig(({mode})=>{
  const variables={...loadEnv(mode,root,''),...process.env};
  const config=variables.MONOPIN_FIREBASE_CONFIG || '';
  const gaMeasurementId=variables.MONOPIN_GA_MEASUREMENT_ID || '';
  if(!config && variables.MONOPIN_VALIDATE_BUILD !== '1') throw new Error('MONOPIN_FIREBASE_CONFIG に Firebase Web アプリの設定JSONを指定してください。');
  if(config){
    const value=JSON.parse(config);
    for(const key of ['apiKey','authDomain','projectId','databaseURL','appId'])if(!value[key])throw new Error('Firebase設定に '+key+' がありません。');
  }
  const repository=(variables.GITHUB_REPOSITORY||'').split('/')[1]||'';
  const base=variables.MONOPIN_BASE || (repository && !repository.endsWith('.github.io') ? '/'+repository+'/' : '/');
  return {
    root:root+'web',base,publicDir:false,plugins:[react()],
    resolve:{alias:{'@':root},dedupe:['react','react-dom']},
    css:{postcss:{plugins:[tailwindcss()]}},
    define:{
      'process.env.NEXT_PUBLIC_ROOM_BACKEND':JSON.stringify('firebase'),
      'process.env.NEXT_PUBLIC_FIREBASE_CONFIG':JSON.stringify(config),
      'process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID':JSON.stringify(gaMeasurementId),
      'process.env.NEXT_PUBLIC_JOIN_ORIGIN':JSON.stringify(''),
    },
    build:{outDir:root+'dist-web',emptyOutDir:true},
  };
});

