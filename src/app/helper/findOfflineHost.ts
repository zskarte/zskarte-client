export default function findOfflineHost() {
  const fromUrlParam = new URLSearchParams(document.location.search).get('offlineHost');
  if (fromUrlParam !== undefined && fromUrlParam !== null) {
    localStorage.setItem('offlineHost', fromUrlParam);
  }
  const previouslyStored = localStorage.getItem('offlineHost');
  if (previouslyStored !== undefined && previouslyStored !== null) {
    return previouslyStored.startsWith('http') ? previouslyStored : 'http://' + previouslyStored;
  }
  return 'http://localhost:8080';
}
