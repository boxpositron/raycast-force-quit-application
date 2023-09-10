import { promisify } from "util";
import { exec } from "child_process";
import { useState, useEffect, useCallback } from "react";
import { List, ActionPanel, Action } from "@raycast/api";

import { type Application } from "./types";

import { toBase64, clusterBy, mapArrayToObject } from "./utils";

import dumpScript from "./scripts/dump-applications";

type State = {
  query: string;
  isLoading: boolean;
  applications: Application[];
};

const execASync = promisify(exec);

function sortApplicationsInAlphabeticalOrder(
  applications: Application[]
): Application[] {
  return applications.sort((a, b) => {
    if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) return -1;
    if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) return 1;

    return 0;
  });
}

async function loadUserApplications(): Promise<Application[]> {
  try {
    const dumpScriptBase64 = toBase64(dumpScript);
    // Run base64 encoded applescript in bash
    const { stdout } = await execASync(
      `echo "${dumpScriptBase64}" | base64 --decode | osascript`
    );

    const data = stdout.split(",").map((item) => item.trim());
    const groups = clusterBy(data, 4);

    const applications = mapArrayToObject<string, Application>(groups, [
      "name",
      "pid",
      "path",
      "icon",
    ]);

    return sortApplicationsInAlphabeticalOrder(applications);
  } catch (err) {
    console.error(err);

    return [];
  }
}

export default function Command() {
  const [state, setState] = useState<State>({
    query: "",
    isLoading: false,
    applications: [],
  });

  const setLoadingState = useCallback(
    (isLoading: boolean) => {
      setState((state) => ({ ...state, isLoading }));
    },
    [setState]
  );

  const handleSearchTextChange = useCallback(
    (query: string) => {
      setState((state) => ({ ...state, query }));
    },
    [setState]
  );

  const hydrateApplications = useCallback(async function () {
    setLoadingState(true);
    const applications = await loadUserApplications();
    setState((state) => ({ ...state, applications }));
    setLoadingState(false);
  }, []);

  const closeApplication = useCallback(
    async (application: Application) => {
      setLoadingState(true);
      await execASync(`kill -9 ${application.pid}`);
      await hydrateApplications();
    },
    [hydrateApplications]
  );

  useEffect(() => {
    hydrateApplications();
  }, []);

  return (
    <List
      filtering={true}
      isLoading={state.isLoading}
      searchText={state.query}
      onSearchTextChange={handleSearchTextChange}
    >
      {state.applications.map((application) => {
        return (
          <List.Item
            key={application.pid}
            title={application.name}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={`Close ${application.name}`}
                    onAction={() => closeApplication(application)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
