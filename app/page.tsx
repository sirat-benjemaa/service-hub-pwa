import OfflineStatus from "./offline-status";

import Link from "next/link";

const services = [
  { category: "Maison", title: "Plomberie et dépannage", provider: "Amine Services", price: "À partir de 40 DT" },
  { category: "Entretien", title: "Nettoyage à domicile", provider: "Maison Nette", price: "À partir de 35 DT" },
  { category: "Informatique", title: "Assistance informatique", provider: "Tech Assist", price: "À partir de 50 DT" },
];

export default function Home() {
  return (
    <main id="contenu" className="app-shell mx-auto w-full max-w-6xl py-4 sm:py-6 lg:py-8">
      <a href="#catalogue" className="skip-link">Aller au catalogue</a>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 pb-4 sm:pb-6">
        <Link href="/" aria-label="ServiceHub, accueil" className="inline-flex min-h-11 items-center text-2xl font-bold tracking-tight text-teal-800">ServiceHub<span className="text-orange-600">.</span></Link>
        <nav aria-label="Navigation principale">
          <a href="#catalogue" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">Nos services <span aria-hidden="true" className="ml-2">↗</span></a>
        </nav>
        <span className="w-full text-xs text-slate-500 sm:hidden">Services de proximité</span>
      </header>
      <section className="max-w-3xl py-10 sm:py-14 lg:py-20" aria-labelledby="home-title">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-700 sm:mb-4 sm:text-sm">Votre quotidien, simplifié</p>
        <h1 id="home-title" className="hero-title font-bold tracking-tight">Les bons pros,<br className="hidden sm:block" /> près de chez vous.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">Consultez notre catalogue de démonstration. Une fois préparé, cet accueil reste accessible lorsque votre connexion est interrompue.</p>
        <a href="#catalogue" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-teal-800 px-5 py-3 text-center font-semibold text-white hover:bg-teal-900 sm:mt-8 sm:w-auto">Découvrir les services <span aria-hidden="true">↓</span></a>
      </section>
      <OfflineStatus />
      <section id="catalogue" className="scroll-mt-6 pb-8 pt-4 sm:pb-10 sm:pt-6" aria-labelledby="catalog-title">
        <div className="mb-5 flex flex-col gap-2 lg:mb-6 lg:flex-row lg:items-baseline lg:justify-between">
          <h2 id="catalog-title" className="text-xl font-bold sm:text-2xl">Services à découvrir</h2>
          <p className="text-xs leading-5 text-slate-500 sm:text-sm">Données fictives · démonstration PWA</p>
        </div>
        <div data-service-grid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {services.map((service, index) => (
            <article key={service.title} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
                <span className="rounded-lg bg-teal-50 px-3 py-2 font-mono text-teal-800">0{index + 1}</span>
                <span className="text-sm text-slate-500">{service.category}</span>
              </div>
              <h3 className="text-lg font-semibold leading-7 sm:text-xl">{service.title}</h3>
              <p className="mb-6 mt-2 text-sm text-slate-500 sm:text-base">{service.provider}</p>
              <p className="mt-auto border-t border-slate-100 pt-4 text-sm font-semibold text-teal-800 sm:text-base">{service.price}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-500">Hors ligne, les informations affichées sont celles de la dernière version sauvegardée. Les réservations et les disponibilités nécessiteront une validation par le serveur.</p>
      </section>
      <footer className="flex flex-col gap-1 border-t border-slate-200 py-5 text-xs leading-6 text-slate-500 sm:flex-row sm:justify-between sm:py-6 sm:text-sm"><span className="font-semibold text-teal-800">ServiceHub</span><span>Projet Modern Mobile Application</span></footer>
    </main>
  );
}
