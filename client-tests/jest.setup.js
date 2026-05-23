
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

window.firebase = {
    apps: [],
    initializeApp: () => {},
    auth: () => ({
        onAuthStateChanged: () => {},
        signInWithEmailAndPassword: () => {},
        signOut: () => {}
    }),
    firestore: () => ({
        collection: () => ({
            doc: () => ({
                get: () => {},
                set: () => {},
                update: () => {}
            })
        })
    })
};
