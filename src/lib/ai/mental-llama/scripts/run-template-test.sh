#!/bin/bash
# MentalLLaMA Template Testing Script
# This script runs a test of clinical prompt templates against sample inputs

# Set the model size
MODEL_SIZE=${1:-13B}
echo "Using MentalLLaMA-chat-${MODEL_SIZE} model"

# Set paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../../../.." && pwd)"
CLINICAL_DIR="${PROJECT_ROOT}/src/lib/ai/mental-llama/templates/clinical"
OUTPUT_DIR="${PROJECT_ROOT}/src/lib/ai/mental-llama/test-results"
SAMPLE_DIR="${PROJECT_ROOT}/src/lib/ai/mental-llama/scripts/sample-inputs"

# Create output directory if it doesn't exist
mkdir -p "${OUTPUT_DIR}"
mkdir -p "${SAMPLE_DIR}"

# Create sample input files if they don't exist
if [ ! -f "${SAMPLE_DIR}/depression-sample.txt" ]; then
	echo "Creating sample input files..."

	# Depression sample
	cat >"${SAMPLE_DIR}/depression-sample.txt" <<EOF
I don't know how much longer I can keep going. Everything feels pointless and empty. I've been sleeping all day but still feel exhausted. I used to love painting, but now I can't even pick up a brush. My friends have stopped calling because I never have the energy to see them. Sometimes I wonder if they'd even notice if I was gone.
EOF

	# Anxiety sample
	cat >"${SAMPLE_DIR}/anxiety-sample.txt" <<EOF
My mind is constantly racing with worry about everything that could go wrong. I've been having trouble sleeping because I can't turn off my thoughts. Yesterday I had a meeting and my heart was pounding so hard I thought I might pass out. I've started avoiding social events because I'm afraid I'll have a panic attack in public. I check my phone constantly to see if my partner has texted back to make sure they're okay.
EOF

	# Stress sample
	cat >"${SAMPLE_DIR}/stress-sample.txt" <<EOF
Work has been impossible lately. I have three major deadlines this week and my boss keeps adding more to my plate. I've been getting headaches every day and grinding my teeth at night. I haven't seen my family much because I've been staying late at the office. When I do get home, I'm too wired to relax but too tired to do anything meaningful. I've started drinking more just to be able to fall asleep.
EOF

	# PTSD sample
	cat >"${SAMPLE_DIR}/ptsd-sample.txt" <<EOF
Ever since the accident six months ago, I haven't been the same. I keep having flashbacks of the crash, especially when I hear loud noises or screeching tires. I avoid driving completely now and get anxious even as a passenger. I've been having nightmares where I'm trapped in the car again. I'm constantly on edge, jumping at small sounds. I feel like I'm always bracing for impact.
EOF

	# Suicidal sample
	cat >"${SAMPLE_DIR}/suicidal-sample.txt" <<EOF
I've reached the end of my rope. Nothing helps anymore and I can't see any way this pain will ever end. I've been putting my affairs in order and giving away some of my things. I've thought about how I would do it, and I think I have a plan that would work. No one would miss me for long - they'd be sad at first but eventually they'd realize they're better off.
EOF
fi

# Run tests for each category
echo "========================================"
echo "RUNNING CLINICAL SCENARIO TESTS"
echo "========================================"

# Loop through available templates
for template_file in "${CLINICAL_DIR}"/*.json; do
	template_name=$(basename "${template_file}" .json)
	category=$(echo "${template_name}" | cut -d'-' -f1)
	scenario=$(echo "${template_name}" | cut -d'-' -f2)

	echo "Testing template: ${template_name}"

	# Find the corresponding sample input
	sample_file="${SAMPLE_DIR}/${category}-sample.txt"

	# If sample file exists, run the test
	if [ -f "${sample_file}" ]; then
		echo "Using sample input from: ${sample_file}"

		# Run the clinical scenario test
		npx ts-node "${PROJECT_ROOT}/src/lib/ai/mental-llama/cli/test-clinical-scenarios.ts" analyze \
			--category "${category}" \
			--scenario "${scenario}" \
			--file "${sample_file}" \
			--model "${MODEL_SIZE}" \
			--output "${OUTPUT_DIR}/${template_name}-result.json" \
			--baseline

		echo "Results saved to: ${OUTPUT_DIR}/${template_name}-result.json"
	else
		echo "No sample input found for category: ${category}"
	fi

	echo "----------------------------------------"
done

echo "========================================"
echo "COMPARING SCENARIOS FOR EACH CATEGORY"
echo "========================================"

# Run comparison tests for each category
for category in depression anxiety stress ptsd suicidal; do
	sample_file="${SAMPLE_DIR}/${category}-sample.txt"

	# If sample file exists, run comparison
	if [ -f "${sample_file}" ]; then
		echo "Running scenario comparison for: ${category}"

		npx ts-node "${PROJECT_ROOT}/src/lib/ai/mental-llama/cli/test-clinical-scenarios.ts" compare-scenarios \
			--category "${category}" \
			--file "${sample_file}" \
			--model "${MODEL_SIZE}" \
			--output "${OUTPUT_DIR}/${category}-scenario-comparison.json"

		echo "Comparison saved to: ${OUTPUT_DIR}/${category}-scenario-comparison.json"
		echo "----------------------------------------"
	fi
done

echo "All tests completed. Results available in: ${OUTPUT_DIR}"
