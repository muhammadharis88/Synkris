"use client"

import { usePaginatedQuery } from "convex/react";
import { useEffect } from "react";

import { useSearchParam } from "@/hooks/use-search-param";

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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white p-4">
        <Navbar />
      </div>
      <div className="mt-16 p-4">
        <TemplatesGallery />
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">My Documents</h2>
          <DocumentsTable
            documents={results}
            loadMore={loadMore}
            status={status}
          />
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Shared with me</h2>
          <DocumentsTable
            documents={sharedResults}
            loadMore={loadMoreShared}
            status={sharedStatus}
          />
        </div>
      </div>
    </div>
  );
}

export default Home;