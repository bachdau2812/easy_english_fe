import { useState } from "react";
import { LearningRouteChrome } from "../../home/components/LearningRouteChrome";
import { ListenAndTypeBrowser } from "./ListeningListPage";

export const ListenAndTypeExplorePage = () => {
  const [compactTitle, setCompactTitle] = useState("Listen and Type");

  return (
    <LearningRouteChrome compactTitle={compactTitle}>
      <section className="vocab-route-page vocab-route-page--nav-compact listen-route-page">
        <section className="listen-route-panel">
          <ListenAndTypeBrowser className="listen-type-browser--route" onTitleChange={setCompactTitle} />
        </section>
      </section>
    </LearningRouteChrome>
  );
};
