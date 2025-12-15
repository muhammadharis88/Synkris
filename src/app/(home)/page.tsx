"use client"

import { usePaginatedQuery } from "convex/react";
import { useEffect } from "react";

import { useSearchParam } from "@/hooks/use-search-param";
import { FullscreenLoader } from "@/components/fullscreen-loader";

import { Navbar } from "./navbar";
import { DocumentsTable } from "./documents-table";
import { TemplatesGallery } from "./templates-gallery";
import { api } from "../../../convex/_generated/api";

const Home = () => {
  const [search] = useSearchParam();
  const {
    results,
    status,
    loadMore
  } = usePaginatedQuery(api.documents.get, { search }, { initialNumItems: 5 });

  const {
    results: sharedResults,
    status: sharedStatus,
    loadMore: loadMoreShared
  } = usePaginatedQuery(api.documents.getShared, {}, { initialNumItems: 5 });

  // Auto-load first page of shared documents if available
  useEffect(() => {
    if (sharedStatus === "CanLoadMore" && sharedResults?.length === 0) {
      loadMoreShared(5);
    }
  }, [sharedStatus, sharedResults, loadMoreShared]);

  if (results === undefined || sharedResults === undefined) {
    return <FullscreenLoader label="Loading documents..." />;
  }

  // Merge and sort documents
  const documents = [
    ...(results || []),
    ...(sharedResults || [])
  ].sort((a, b) => b._creationTime - a._creationTime);

  const loadMoreAll = (numItems: number) => {
    if (status === "CanLoadMore") loadMore(numItems);
    if (sharedStatus === "CanLoadMore") loadMoreShared(numItems);
  };

  const statusAll = (status === "CanLoadMore" || sharedStatus === "CanLoadMore")
    ? "CanLoadMore"
    : "Exhausted";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white p-4">
        <Navbar />
      </div>
      <div className="mt-16 p-4">
        <TemplatesGallery />
        <div className="mt-8">
          <DocumentsTable
            documents={documents}
            loadMore={loadMoreAll}
            status={statusAll}
          />
        </div>
      </div>
    </div>
  );
}

export default Home;